import test from 'node:test'
import assert from 'node:assert/strict'
import { checkLineSubscribers } from '../../scripts/lib/line-push.mjs'

test('LINE aurora sends only after conditions and a fresh delivery claim, independently of Web Push', async () => {
  const now = new Date('2026-10-30T20:00:00Z')
  const sent = [], marked = []
  let claims = 0
  const store = {
    acquire: async () => true, release: async () => {},
    subscribers: async () => [{ user_id: 'member', link_id: 'link', lastSentNight: '2026-10-30' }],
    claimDelivery: async () => ++claims === 1 ? { lineUserId: 'line', retryKey: 'stable' } : null,
    sent: async (...args) => { marked.push(args) },
  }
  const line = { remaining: async () => 200, push: async (...args) => { sent.push(args) } }
  const load = async () => ({ cloud: { daily: { sunset: ['2026-10-30T18:00'], sunrise: ['2026-10-31T08:00'] }, hourly: { time: ['2026-10-30T21:00'], cloud_cover: [10] } }, kp: [{ observed: 'predicted', time_tag: '2026-10-30T21:00:00Z', kp: 4 }] })
  await checkLineSubscribers({ store, line, origin: 'https://example.test', now, load })
  await checkLineSubscribers({ store, line, origin: 'https://example.test', now, load })
  assert.equal(sent.length, 1)
  assert.equal(marked.length, 1)
  assert.equal(sent[0][2], 'stable')
  assert.ok(sent[0][1][0].text.includes('不保證'))
})

test('LINE pushes stop when out of quota, out of trip dates or sources fail', async () => {
  let claims = 0, releases = 0
  const store = { acquire: async () => true, release: async () => { releases++ }, subscribers: async () => [{ user_id: 'member', link_id: 'link' }], claimDelivery: async () => { claims++ } }
  const line = { remaining: async () => 0, push: async () => { throw new Error('must_not_send') } }
  await checkLineSubscribers({ store, line, origin: 'https://example.test', now: new Date('2026-10-30T20:00:00Z') })
  await checkLineSubscribers({ store, line, origin: 'https://example.test', now: new Date('2026-11-08T20:00:00Z') })
  await checkLineSubscribers({ store, line: { ...line, remaining: async () => 200 }, origin: 'https://example.test', now: new Date('2026-10-30T20:00:00Z'), load: async () => { throw new Error('offline') } })
  assert.equal(claims, 0)
  assert.equal(releases, 2)
})
