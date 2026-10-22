import test from 'node:test'
import assert from 'node:assert/strict'
import { checkSubscribers, notificationNight } from '../../scripts/lib/aurora-push.mjs'
import { tripNightCity, TRIP_PUSH_EXPIRY } from '../../shared/aurora-trip.mjs'
const record=()=>({id:'trip',scope:'trip',cityId:'reykjavik',nightDate:'2026-10-23',expiresAt:TRIP_PUSH_EXPIRY,enabled:true,subscription:{},attempts:0})
async function run(records,time,sent=[],loads=[]) {
 await checkSubscribers({records,now:new Date(time),save:async()=>{},send:async(entry,payload)=>sent.push({night:entry.nightDate,payload}),load:async(city,night)=>{
  loads.push(city)
  const tomorrow=new Date(Date.parse(night+'T12:00Z')+86400000).toISOString().slice(0,10)
  return {cloud:{daily:{sunset:[night+'T16:00'],sunrise:[tomorrow+'T09:00']},hourly:{time:[night+'T23:00'],cloud_cover:[10]}},kp:[{time_tag:night+'T21:00Z',kp:4,observed:'predicted'}]}
 }})
}
test('trip nights map only to existing observation cities, including after midnight',()=>{
 assert.deepEqual(['2026-10-30','2026-10-31','2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06'].map(tripNightCity),['reykjavik','reykjavik','golden','vik','jokulsarlon','jokulsarlon','reykjavik','keflavik'])
 assert.equal(tripNightCity('2026-10-29'),null);assert.equal(tripNightCity('2026-11-07'),null)
 assert.equal(tripNightCity(notificationNight(new Date('2026-11-07T02:30Z'))),'keflavik')
})
test('trip subscription sends once each night and automatically changes city',async()=>{
 const rows=[record()],sent=[],loads=[]
 await run(rows,'2026-10-30T22:00Z',sent,loads);await run(rows,'2026-10-30T22:15Z',sent,loads)
 await run(rows,'2026-11-02T22:00Z',sent,loads)
 assert.equal(sent.length,2);assert.deepEqual(loads,['reykjavik','vik']);assert.deepEqual(sent.map(x=>x.night),['2026-10-30','2026-11-02'])
})
test('outside trip nights stays silent, expiry clears registration, cancellation stays off',async()=>{
 const rows=[record()],sent=[],loads=[]
 await run(rows,'2026-10-29T22:00Z',sent,loads);await run(rows,'2026-11-07T10:00Z',sent,loads)
 assert.equal(sent.length,0);assert.equal(loads.length,0)
 await run(rows,TRIP_PUSH_EXPIRY,sent,loads);assert.equal(rows[0].enabled,false);assert.equal(rows[0].subscription,null)
 const cancelled=[{...record(),enabled:false,subscription:null}]
 await run(cancelled,'2026-11-02T22:00Z',sent,loads);assert.equal(loads.length,0)
})
test('transient attempts reset on a new night without cancelling trip subscription',async()=>{
 const rows=[{...record(),nightDate:'2026-10-30',attempts:3}],sent=[]
 await run(rows,'2026-10-30T22:00Z',sent);assert.equal(sent.length,0)
 await run(rows,'2026-11-02T22:00Z',sent);assert.equal(sent.length,1)
})
