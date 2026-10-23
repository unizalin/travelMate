import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { verifySignature, parseLineEvents } from '../../scripts/lib/line-security.mjs'

const raw = Buffer.from(JSON.stringify({ destination: 'bot', events: [] }))
const secret = 'test-channel-secret'
const signature = createHmac('sha256', secret).update(raw).digest('base64')

test('LINE signature verifies original bytes and fails closed on malformed input', () => {
  assert.equal(verifySignature(raw, signature, secret), true)
  for (const body of [Buffer.from('{}'), Buffer.concat([raw, Buffer.from(' ')])]) {
    assert.equal(verifySignature(body, signature, secret), false)
  }
  for (const value of [null, '', '!', signature.slice(1), `${signature}\n`, [signature]]) {
    assert.equal(verifySignature(raw, value, secret), false)
  }
  assert.equal(verifySignature(raw, signature, ''), false)
})

test('LINE webhook parser accepts empty verification and rejects invalid envelopes', () => {
  assert.deepEqual(parseLineEvents(raw), [])
  for (const value of ['not json', '{}', '{"events":null}', '{"events":[null]}']) {
    assert.throws(() => parseLineEvents(Buffer.from(value)), /invalid_webhook/)
  }
})
