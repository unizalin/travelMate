import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { eligibleAuroraWindow, validSubscription, checkSubscribers, notificationNight } from '../../scripts/lib/aurora-push.mjs'
const now = new Date('2026-10-30T22:00:00Z')
const cloud = { daily: { sunset: ['2026-10-30T17:00'], sunrise: ['2026-10-31T09:00'] }, hourly: { time: ['2026-10-30T23:00'], cloud_cover: [20] } }
const kp = [{ time_tag:'2026-10-30T21:00:00Z', observed:'predicted', kp:4 }]
const subscription = { endpoint:'https://fcm.googleapis.com/fcm/send/example', keys:{p256dh:Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString('base64url'), auth:Buffer.alloc(16).toString('base64url')} }

describe('Aurora push policy', () => {
 it('requires aligned night-time cloud and forecast activity, not observations', () => {
  assert.equal(eligibleAuroraWindow({cloud, kp, now, nightDate:'2026-10-30'}), '2026-10-30T23:00Z')
  assert.equal(eligibleAuroraWindow({cloud, kp:[{...kp[0], observed:'observed'}], now, nightDate:'2026-10-30'}), null)
  assert.equal(eligibleAuroraWindow({cloud:{...cloud,hourly:{...cloud.hourly,cloud_cover:[null]}}, kp, now, nightDate:'2026-10-30'}), null)
  assert.equal(eligibleAuroraWindow({cloud, kp, now:new Date('2026-10-31T10:00:00Z'), nightDate:'2026-10-30'}), null)
 })
 it('rejects private-network endpoints and invalid subscription keys', () => {
  assert.equal(validSubscription(subscription), true)
  assert.equal(validSubscription({...subscription,endpoint:'https://127.0.0.1/private'}),false)
  assert.equal(validSubscription({...subscription,endpoint:'https://fcm.googleapis.com.evil.test/private'}),false)
  assert.equal(validSubscription({...subscription,endpoint:'http://fcm.googleapis.com/private'}),false)
  assert.equal(validSubscription({...subscription,keys:{auth:'bad',p256dh:'bad'}}),false)
 })
 it('keeps late-night subscriptions tied to the night they refer to', () => {
  assert.equal(notificationNight(new Date('2026-10-31T02:00:00Z')), '2026-10-30')
 })
 it('sends once per night and does not repeatedly notify after a successful delivery', async () => {
  const records=[{id:'a', cityId:'reykjavik', nightDate:'2026-10-30', expiresAt:'2026-10-31T12:00:00Z', subscription, enabled:true, attempts:0}]
  let sent=0
  const options={records, now, load:async()=>({cloud,kp}), send:async()=>{sent++}, save:async()=>{}}
  await checkSubscribers(options)
  await checkSubscribers(options)
  assert.equal(sent,1)
 })
 it('does not send on missing sources or expired subscriptions', async () => {
  const records=[{id:'a', cityId:'reykjavik', nightDate:'2026-10-30', expiresAt:'2026-10-30T20:00:00Z', subscription, enabled:true, attempts:0}]
  let sent=0
  await checkSubscribers({records,now,load:async()=>{throw new Error('unavailable')},send:async()=>{sent++},save:async()=>{}})
  assert.equal(sent,0)
  assert.equal(records[0].enabled,false)
  assert.equal(records[0].subscription,null)
 })
})
