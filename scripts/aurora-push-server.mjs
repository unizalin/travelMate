import { tripNightCity, TRIP_PUSH_EXPIRY } from '../shared/aurora-trip.mjs'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { CITIES, validSubscription, checkSubscribers, notificationNight } from './lib/aurora-push.mjs'

export function makePushHandler({origin,publicKey,records,authorize,save,now=()=>new Date()}) {
 return async (req,res)=>{
  const reply=(status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body))}
  try {
   if (req.headers.origin && req.headers.origin!==origin) return reply(403,{error:'來源不符。'})
   const path=new URL(req.url,origin).pathname
   if (req.method==='GET'&&path==='/api/aurora-notifications/config') return reply(200,{ready:true,publicKey,local:!origin.startsWith('https://')})
   if (!['/api/aurora-notifications/status','/api/aurora-notifications/subscribe','/api/aurora-notifications/unsubscribe'].includes(path)||req.method!=='POST') return reply(404,{error:'找不到服務。'})
   const authorization=req.headers.authorization
   if (typeof authorization!=='string'||!authorization.startsWith('Bearer ')) return reply(401,{error:'請先登入。'})
   const user=await authorize(authorization.slice(7),path.endsWith('/subscribe'))
   if (!user) return reply(403,{error:'請先登入並加入這趟旅程。'})
   let size=0, chunks=[]
   for await (const chunk of req) {size+=chunk.length;if(size>16000)return reply(413,{error:'資料過大。'});chunks.push(chunk)}
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')
   if (typeof body.endpoint!=='string' || body.endpoint.length>4096) return reply(400,{error:'通知訂閱無效。'})
   const id=createHash('sha256').update(body.endpoint).digest('hex')
   const existing=records.find(record=>record.id===id)
   if (existing&&existing.userId!==user.id) return reply(403,{error:'這部裝置的訂閱屬於另一個帳號，請先從原帳號關閉。'})
   if (path.endsWith('/status')) return reply(200,{enabled:Boolean(existing?.enabled&&Date.parse(existing.expiresAt)>now().getTime()),scope:existing?.scope || 'tonight',cityId:existing?.scope==='trip'?tripNightCity(notificationNight(now())):existing?.cityId,expiresAt:existing?.expiresAt})
   if (path.endsWith('/unsubscribe')) {if(existing){const previous=structuredClone(existing);existing.enabled=false;existing.subscription=null;try{await save()}catch(error){Object.assign(existing,previous);throw error}}return reply(200,{enabled:false})}
   if (!validSubscription(body.subscription)||body.subscription.endpoint!==body.endpoint) return reply(400,{error:'通知地區或訂閱資料無效。'})
   const active=records.filter(record=>record.userId===user.id&&record.enabled&&Date.parse(record.expiresAt)>now().getTime())
   if (!existing&&active.length>=5) return reply(429,{error:'已達裝置上限，請先關閉不使用的裝置。'})
   if (now().getTime()>=Date.parse(TRIP_PUSH_EXPIRY)) return reply(400,{error:'冰島段極光提醒期間已結束。'})
   const nightDate=notificationNight(now())
   const entry={id,userId:user.id,scope:'trip',cityId:tripNightCity(nightDate)||'reykjavik',nightDate,expiresAt:TRIP_PUSH_EXPIRY,subscription:{endpoint:body.endpoint,keys:{p256dh:body.subscription.keys.p256dh,auth:body.subscription.keys.auth}},enabled:true,lastSentNight:existing?.lastSentNight??null,attempts:existing?.nightDate===nightDate?(existing.attempts??0):0}
   const previous=existing?structuredClone(existing):null
   if(existing)Object.assign(existing,entry);else records.push(entry)
   try { await save() } catch(error) { if(existing)Object.assign(existing,previous);else records.splice(records.indexOf(entry),1);throw error }
   return reply(200,{enabled:true,scope:'trip',cityId:tripNightCity(nightDate),expiresAt:entry.expiresAt})
  } catch { return reply(500,{error:'通知設定暫時無法儲存，請重試。'}) }
 }
}
export async function startPushServer() {
 config({path:'.env',quiet:true});config({path:'.env.local',override:true,quiet:true})
 const origin=process.env.AURORA_APP_ORIGIN||'http://127.0.0.1:5174'
 const supabaseUrl=process.env.VITE_SUPABASE_URL, anonKey=process.env.VITE_SUPABASE_ANON_KEY, tripId=process.env.VITE_ICELAND_TRIP_ID?.trim()
 if(!supabaseUrl||!anonKey||!tripId)throw new Error('Missing local authentication configuration; notification service not started.')
 const folder=resolve(process.env.AURORA_PUSH_DATA_DIR||'.local/aurora-push')
 mkdirSync(folder,{recursive:true,mode:0o700})
 const keyFile=resolve(folder,'vapid.json'),dataFile=resolve(folder,'subscriptions.json')
 const keys=existsSync(keyFile)?JSON.parse(readFileSync(keyFile,'utf8')):webpush.generateVAPIDKeys()
 if(!existsSync(keyFile))writeFileSync(keyFile,JSON.stringify(keys),{mode:0o600})
 if(typeof keys.publicKey!=='string'||typeof keys.privateKey!=='string')throw new Error('Push key file is invalid.')
 const contact=process.env.AURORA_PUSH_CONTACT||'https://travelmate.local'
 if(process.env.NODE_ENV==='production'&&(!process.env.AURORA_APP_ORIGIN||!process.env.AURORA_PUSH_CONTACT||!origin.startsWith('https://')))throw new Error('Production push requires HTTPS origin and contact configuration.')
 webpush.setVapidDetails(contact,keys.publicKey,keys.privateKey)
 const records=existsSync(dataFile)?JSON.parse(readFileSync(dataFile,'utf8')):[]
 if(!Array.isArray(records)||records.some(entry=>!entry||typeof entry.id!=='string'||typeof entry.userId!=='string'||!Object.hasOwn(CITIES,entry.cityId)||!Number.isFinite(Date.parse(entry.expiresAt))))throw new Error('Subscription storage invalid; refusing to overwrite.')
 const save=()=>{const temporary=`${dataFile}.tmp`;writeFileSync(temporary,JSON.stringify(records),{mode:0o600});renameSync(temporary,dataFile)}
 const authorize=async(token,requireTrip)=>{
  const client=createClient(supabaseUrl,anonKey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(8000)})}})
  const {data,error}=await client.auth.getUser(token)
  if(error||!data.user)return null
  if(requireTrip){const result=await client.rpc('tripbook_can_read',{p_trip_id:tripId});if(result.error||result.data!==true)return null}
  return {id:data.user.id}
 }
 const handler=makePushHandler({origin,publicKey:keys.publicKey,records,authorize,save})
 const server=createServer(handler)
 let busy=false
 const check=async()=>{if(busy)return;busy=true;try{await checkSubscribers({records,save,send:(entry,payload)=>webpush.sendNotification(entry.subscription,JSON.stringify(payload),{TTL:600,urgency:'normal',timeout:10000})})}finally{busy=false}}
 let timer
 server.listen(Number(process.env.AURORA_PUSH_PORT||8788),'127.0.0.1',()=>{console.log('Aurora notification service listening on 127.0.0.1; checks every 5 minutes.');void check();timer=setInterval(()=>{void check()},5*60000)})
 server.on('error',()=>{console.error('Notification service could not bind to its port.');process.exitCode=1})
 const close=()=>{if(timer)clearInterval(timer);server.close()}
 process.once('SIGINT',close);process.once('SIGTERM',close)
 return server
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) startPushServer().catch(()=>{console.error('Notification service failed to start. Check configuration and local authentication service.');process.exitCode=1})
