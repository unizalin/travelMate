import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { makeCloudPushHandler } from '../../scripts/lib/aurora-cloud.mjs'
import { createHash } from 'node:crypto'
const endpoint='https://fcm.googleapis.com/fcm/send/cloud-test'
test('cloud handler enforces authentication, membership, ownership and expiry',async()=>{
 let rows=[];let locked=false
 const store={acquire:async()=>{if(locked)return false;locked=true;return true},release:async()=>{locked=false},read:async()=>structuredClone(rows),write:async next=>{rows=structuredClone(next)}}
 const server=createServer(makeCloudPushHandler({store,origin:'http://app.test',publicKey:'public-fixture',secret:'test-only-secret',authorize:async(token,member)=>token==='member'?{id:'owner'}:token==='outsider'&&!member?{id:'outsider'}:null,send:async()=>{},now:()=>new Date('2026-10-30T22:00:00Z')}))
 server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`
 const post=(action,token,body={endpoint})=>fetch(`${base}/api/aurora-notifications/${action}`,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)})
 try {
  assert.equal((await post('status',null)).status,401)
  assert.equal((await post('subscribe','outsider')).status,403)
  rows=[{id:createHash('sha256').update(endpoint).digest('hex'),user_id:'owner',city_id:'reykjavik',night_date:'2026-10-29',expires_at:'2026-10-30T12:00:00Z',subscription:null,enabled:true,last_sent_night:null,attempts:0}]
  assert.equal((await post('status','outsider')).status,403)
  assert.equal((await (await post('status','member')).json()).enabled,false)
  assert.equal((await post('check',null,{})).status,401)
  const config=await fetch(`${base}/api/aurora-notifications/config`);assert.deepEqual(await config.json(),{ready:true,publicKey:'public-fixture',local:false})
 } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
})

test('Vercel parsed JSON supports subscribe, status, manual send and unsubscribe',async()=>{
 let rows=[];const sent=[]
 const store={acquire:async()=>true,release:async()=>{},read:async()=>structuredClone(rows),write:async next=>{rows=structuredClone(next)}}
 const handler=makeCloudPushHandler({store,origin:'https://app.test',publicKey:'fixture',secret:'test-only-secret',authorize:async()=>({id:'owner'}),send:async(entry,payload)=>sent.push({entry,payload}),now:()=>new Date('2026-10-30T22:00:00Z')})
 async function request(action,body,token='member') {
  let status,payload
  await handler({url:`/api/aurora-notifications/${action}`,method:'POST',headers:{authorization:`Bearer ${token}`},body},{writeHead:code=>{status=code},end:value=>{payload=JSON.parse(value)}})
  return {status,payload}
 }
 const subscription={endpoint,keys:{p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64)]).toString('base64url'),auth:Buffer.alloc(16).toString('base64url')}}
 assert.equal((await request('subscribe',{endpoint,subscription,cityId:'reykjavik'})).payload.enabled,true)
 assert.equal((await request('status',{endpoint})).payload.enabled,true)
 assert.deepEqual((await request('check',{testUserId:'owner'},'test-only-secret')).payload,{tested:1})
 assert.equal(sent.length,1);assert.match(sent[0].payload.title,/測試/)
 assert.equal(rows[0].last_sent_night,null)
 assert.equal((await request('unsubscribe',{endpoint})).payload.enabled,false)
 assert.equal((await request('status',{endpoint})).payload.enabled,false)
})

test('unconfigured production runtime returns JSON and keeps check protected',async()=>{
 const {default:handler}=await import('../../scripts/lib/aurora-runtime.mjs')
 const previous=process.env.AURORA_VAPID_PRIVATE_KEY
 delete process.env.AURORA_VAPID_PRIVATE_KEY
 async function request(action,method) {
  let status,headers,payload
  await handler({url:`/api/aurora-notifications/${action}`,method,headers:{}},{writeHead:(code,value)=>{status=code;headers=value},end:value=>{payload=JSON.parse(value)}})
  return {status,headers,payload}
 }
 try {
  const config=await request('config','GET')
  assert.equal(config.status,503);assert.equal(config.headers['content-type'],'application/json');assert.equal(config.payload.ready,undefined)
  assert.equal((await request('check','POST')).status,401)
  assert.equal((await request('subscribe','POST')).status,401)
 }finally{if(previous===undefined)delete process.env.AURORA_VAPID_PRIVATE_KEY;else process.env.AURORA_VAPID_PRIVATE_KEY=previous}
})
