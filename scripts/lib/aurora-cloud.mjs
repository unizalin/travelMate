import { randomUUID, timingSafeEqual } from 'node:crypto'
import { Readable } from 'node:stream'
import { makePushHandler } from '../aurora-push-server.mjs'
import { checkSubscribers } from './aurora-push.mjs'
const columns={userId:'user_id',cityId:'city_id',nightDate:'night_date',expiresAt:'expires_at',lastSentNight:'last_sent_night'}
const decode=row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[Object.keys(columns).find(name=>columns[name]===key)||key,value]))
const encode=row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[columns[key]||key,value]))
export function cronAuthorized(header,secret) {
 const expected=secret?`Bearer ${secret}`:''
 return typeof header==='string' && !!expected && Buffer.byteLength(header)===Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(header),Buffer.from(expected))
}
export function makeCloudPushHandler({store,authorize,origin,publicKey,secret,send,now=()=>new Date(),load}) {
 return async(req,res)=>{
  const reply=(status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body))}
  const path=new URL(req.url,origin).pathname
  if(req.headers.origin&&req.headers.origin!==origin)return reply(403,{error:'來源不符。'})
  if(path.endsWith('/config'))return req.method==='GET'?reply(200,{ready:true,publicKey,local:false}):reply(405,{error:'不支援此操作。'})
  if(path.endsWith('/check')) {
   if(!cronAuthorized(req.headers.authorization,secret))return reply(401,{error:'未授權。'})
   if(!['POST','GET'].includes(req.method))return reply(405,{error:'不支援此操作。'})
  } else if(!req.headers.authorization?.startsWith('Bearer '))return reply(401,{error:'請先登入。'})
  const lease=randomUUID()
  let acquired=false
  try {acquired=await store.acquire(lease)} catch {}
  if(!acquired)return reply(503,{error:'通知服務忙碌，請稍後重試。'})
  try {
   const records=(await store.read()).map(decode)
   const save=()=>store.write(records.map(encode))
   if(path.endsWith('/check')) {
    if(req.method==='POST' && req.body?.testUserId) {
     const targets=records.filter(record=>record.userId===req.body.testUserId && record.enabled && record.subscription && Date.parse(record.expiresAt)>now().getTime())
     for(const record of targets)await send(record,{title:'travelMate 推播測試',body:'這是手動測試通知，不代表極光預報。',expiresAt:new Date(now().getTime()+600000).toISOString()})
     return reply(200,{tested:targets.length})
    }
    await checkSubscribers({records,save,send,now:now(),...(load?{load}:{})})
    return reply(200,{checked:true})
   }
   // Vercel may parse JSON; the existing local handler consumes a request stream.
   const stream=req.body&&typeof req.body==='object'?Object.assign(Readable.from([Buffer.from(JSON.stringify(req.body))]),{headers:req.headers,url:req.url,method:req.method}):req
   await makePushHandler({origin,publicKey,records,authorize,save,now})(stream,res)
  } catch {return reply(503,{error:'通知服務暫時無法使用，請重試。'})}
  finally {await store.release(lease).catch(()=>{})}
 }
}
