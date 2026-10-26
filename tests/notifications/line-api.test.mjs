import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { createHmac } from 'node:crypto'
import { makeLineHandler } from '../../scripts/lib/line-api.mjs'

const origin = 'https://example.test'
const secret = 'secret'
const uid = `U${'a'.repeat(32)}`
function fixture(options = {}) {
  const replies = [], seen = new Set()
  const store = {
    event: async (id, owner, complete) => complete || seen.has(id) ? 'completed' : (seen.add(id), 'claimed'),
    bindingForLine: async () => null,
    block: async () => {},
  }
  const line = { reply: async (token, messages) => { replies.push(messages) } }
  const handler = makeLineHandler({ store, line, authorize: async token => token === 'member' ? { id: 'member' } : null, origin, secret, ...options })
  const call = async (action, body, headers = {}, sign = false) => {
    const bytes = Buffer.from(JSON.stringify(body))
    const req = Object.assign(Readable.from([bytes]), { url: `/api/line?action=${action}`, method: 'POST', headers: { ...headers } })
    if (sign) req.headers['x-line-signature'] = createHmac('sha256', secret).update(bytes).digest('base64')
    let status, value
    await handler(req, { writeHead: code => { status = code }, end: text => { value = JSON.parse(text) } })
    return { status, value }
  }
  return { call, replies, store }
}

test('LINE webhook verifies signatures before any side effects', async () => {
  const f = fixture()
  assert.equal((await f.call('webhook', { events: [] })).status, 401)
  assert.equal((await f.call('webhook', { events: [] }, {}, true)).status, 200)
  assert.equal(f.replies.length, 0)
})

test('LINE repeats do not duplicate replies and group events do not expose member flows', async () => {
  const f = fixture()
  const event = { webhookEventId: 'one', type: 'message', timestamp: Date.now(), replyToken: 'reply', source: { type: 'user', userId: uid }, message: { type: 'text', text: '今日行程' } }
  assert.equal((await f.call('webhook', { events: [event] }, {}, true)).status, 200)
  await f.call('webhook', { events: [event] }, {}, true)
  assert.equal(f.replies.length, 1)
  assert.equal(f.replies[0][0].type, 'flex')
  assert.ok(JSON.stringify(f.replies[0][0]).includes('/iceland'))
  await f.call('webhook', { events: [{ ...event, webhookEventId: 'group', source: { type: 'group', userId: uid } }] }, {}, true)
  assert.equal(f.replies.length, 1)
})

test('LINE member endpoints reject nonmembers and cross-origin requests', async () => {
  const f = fixture()
  assert.equal((await f.call('status', {})).status, 401)
  assert.equal((await f.call('status', {}, { authorization: 'Bearer outsider' })).status, 403)
  assert.equal((await f.call('status', {}, { authorization: 'Bearer member', origin: 'https://evil.test' })).status, 403)
})

test('LINE in-flight event leases request redelivery instead of acknowledging lost work', async () => {
  const f = fixture()
  f.store.event = async () => 'busy'
  const event = { webhookEventId: 'busy', type: 'message', timestamp: Date.now(), replyToken: 'reply', source: { type: 'user', userId: uid }, message: { type: 'text', text: '今日行程' } }
  assert.equal((await f.call('webhook', { events: [event] }, {}, true)).status, 503)
  assert.equal(f.replies.length, 0)
})

test('LINE binding uses the authenticated account and the official redirect, never a posted user ID', async () => {
  const f = fixture()
  let target
  f.store.prepareLink = async (hash, user, nonce) => { target = { hash, user, nonce }; return 'issued-link-token' }
  const result = await f.call('bind', { ticket: 'a'.repeat(64), userId: 'attacker' }, { authorization: 'Bearer member' })
  assert.equal(result.status, 200)
  assert.equal(target.user, 'member')
  assert.match(target.nonce, /^[0-9a-f]{64}$/)
  const redirect = new URL(result.value.redirectUrl)
  assert.equal(redirect.origin, 'https://access.line.me')
  assert.equal(redirect.pathname, '/dialog/bot/accountLink')
  assert.equal(redirect.searchParams.get('linkToken'), 'issued-link-token')
  assert.equal((await f.call('bind', { ticket: 'broken' }, { authorization: 'Bearer member' })).status, 400)
})

test('LINE subscriptions cannot report enabled before the production delivery switch is on', async () => {
  const f = fixture()
  assert.equal((await f.call('enable', {}, { authorization: 'Bearer member' })).status, 503)
})

for (const command of ['今日行程', '完整旅程', '行程 2026-11-02', '天氣', '極光', '天氣／極光', '行前準備', '通知設定', '綁定', '開啟極光提醒', '未知指令']) {
  test(`reply-only ${command} returns a card without push, quota lookup or binding creation`, async () => {
    const f = fixture({ loadWeather: async () => null })
    const event = { webhookEventId: 'card', type: 'message', replyToken: 'single-use', source: { type: 'user', userId: uid }, message: { type: 'text', text: command } }
    assert.equal((await f.call('webhook', { events: [event] }, {}, true)).status, 200)
    assert.equal(f.replies.length, 1)
    assert.equal(f.replies[0][0].type, 'flex')
  })
}

test('failed replies never fall back to quota-consuming push', async () => {
  let pushes = 0
  const handler = makeLineHandler({ store: { event: async () => 'claimed' }, line: { reply: async () => { throw Error('expired_reply_token') }, push: async () => { pushes++ } }, origin, secret })
  const bytes = Buffer.from(JSON.stringify({ events: [{ webhookEventId: 'failed', type: 'message', replyToken: 'expired', source: { type: 'user', userId: uid }, message: { type: 'text', text: '今日行程' } }] }))
  const req = Object.assign(Readable.from([bytes]), { url: '/api/line?action=webhook', method: 'POST', headers: { 'x-line-signature': createHmac('sha256', secret).update(bytes).digest('base64') } })
  let status
  await handler(req, { writeHead: value => { status = value }, end: () => {} })
  assert.equal(status, 503)
  assert.equal(pushes, 0)
})
