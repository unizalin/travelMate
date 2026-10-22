import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { makeCloudPushHandler, cronAuthorized } from './aurora-cloud.mjs'
export default async function handler(req,res) {
 const env=process.env
 if(new URL(req.url,'https://localhost').pathname.endsWith('/check') && !cronAuthorized(req.headers.authorization,env.CRON_SECRET)){res.writeHead(401,{'content-type':'application/json'});res.end(JSON.stringify({error:'未授權。'}));return}
 if(!new URL(req.url,'https://localhost').pathname.endsWith('/config') && !req.headers.authorization?.startsWith('Bearer ')){res.writeHead(401,{'content-type':'application/json'});res.end(JSON.stringify({error:'請先登入。'}));return}
 try {
 const origin=env.AURORA_APP_ORIGIN,url=env.SUPABASE_URL||env.VITE_SUPABASE_URL,anon=env.SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY
 const ready=origin?.startsWith('https://')&&url&&anon&&env.SUPABASE_SERVICE_ROLE_KEY&&env.AURORA_VAPID_PUBLIC_KEY&&env.AURORA_VAPID_PRIVATE_KEY&&env.AURORA_PUSH_CONTACT&&env.CRON_SECRET&&env.VITE_ICELAND_TRIP_ID
 if(!ready){res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:'正式通知服務尚未完成設定。'}));return}
 const timedFetch=(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(8000)})
 const admin=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:timedFetch}})
 const check=result=>{if(result.error)throw new Error('storage_unavailable');return result.data}
 const store={
  acquire:async owner=>check(await admin.rpc('tripbook_push_lease',{p_owner:owner,p_release:false})),
  release:async owner=>{check(await admin.rpc('tripbook_push_lease',{p_owner:owner,p_release:true}))},
  read:async()=>check(await admin.from('tripbook_push_subscriptions').select('*')),
  write:async records=>{if(records.length)check(await admin.from('tripbook_push_subscriptions').upsert(records))},
 }
 const authorize=async(token,member)=>{
  const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:timedFetch}})
  const {data,error}=await client.auth.getUser(token)
  if(error||!data.user)return null
  if(member){const access=await client.rpc('tripbook_can_read',{p_trip_id:env.VITE_ICELAND_TRIP_ID.trim()});if(access.error||access.data!==true)return null}
  return {id:data.user.id}
 }
 webpush.setVapidDetails(env.AURORA_PUSH_CONTACT,env.AURORA_VAPID_PUBLIC_KEY,env.AURORA_VAPID_PRIVATE_KEY)
 return makeCloudPushHandler({store,authorize,origin,publicKey:env.AURORA_VAPID_PUBLIC_KEY,secret:env.CRON_SECRET,
 send:(entry,payload)=>webpush.sendNotification(entry.subscription,JSON.stringify(payload),{TTL:600,urgency:'normal',timeout:10000})})(req,res)
 } catch {res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:'通知服務設定無效或暫時無法使用。'}))}
}
