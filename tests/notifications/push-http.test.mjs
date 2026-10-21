import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { makePushHandler } from '../../scripts/aurora-push-server.mjs'
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64)]).toString('base64url'),auth:Buffer.alloc(16).toString('base64url')}}
async function fixture(t,{failSave=false}={}) {
 const records=[]
 const server=createServer(makePushHandler({origin:'http://app.test',publicKey:'public-test-key',records,authorize:async(token,trip)=>token==='member'?{id:'a'}:token==='other'&&!trip?{id:'b'}:null,save:async()=>{if(failSave)throw new Error('disk full')},now:()=>new Date('2026-10-30T20:00:00Z')}))
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close()})
 const url=`http://127.0.0.1:${server.address().port}/api/aurora-notifications`
 const post=(action,token='member',data={endpoint:subscription.endpoint,subscription,cityId:'vik'},origin='http://app.test')=>fetch(`${url}/${action}`,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{ }),origin},body:JSON.stringify(data)})
 return {records,post}
}
test('rejects unauthenticated, nonmember, cross-origin and private-network registrations',async t=>{
 const {post,records}=await fixture(t)
 assert.equal((await post('subscribe','')).status,401)
 assert.equal((await post('subscribe','other')).status,403)
 assert.equal((await post('subscribe','member',undefined,'http://evil.test')).status,403)
 assert.equal((await post('subscribe','member',{endpoint:'https://127.0.0.1/private',subscription:{...subscription,endpoint:'https://127.0.0.1/private'},cityId:'vik'})).status,400)
 assert.equal(records.length,0)
})
test('confirms registration only after saving and isolates status/cancellation by account',async t=>{
 const {post,records}=await fixture(t)
 const result=await (await post('subscribe')).json();assert.equal(result.enabled,true);assert.equal(records.length,1)
 assert.equal((await post('status','other')).status,403)
 assert.equal((await post('unsubscribe','other')).status,403)
 assert.equal((await (await post('unsubscribe')).json()).enabled,false)
 assert.equal(records[0].subscription,null)
})
test('does not leave an active in-memory registration when storage fails',async t=>{
 const {post,records}=await fixture(t,{failSave:true})
 assert.equal((await post('subscribe')).status,500)
 assert.equal(records.some(record=>record.enabled),false)
})
