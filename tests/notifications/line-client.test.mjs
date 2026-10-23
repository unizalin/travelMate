import test from 'node:test'
import assert from 'node:assert/strict'
import { createLineClient } from '../../scripts/lib/line-client.mjs'

test('LINE unknown push results retry with a stable request ID and accept only confirmed 409 responses', async () => {
  const calls = []
  const line = createLineClient({ token: 'fixture-token', fetcher: async (url, options) => {
    calls.push({ url, options })
    return new Response('{}', { status: 409, headers: { 'x-line-accepted-request-id': 'previous-request' } })
  } })
  await line.push('fixture-user', [{ type: 'text', text: 'fixture' }], 'retry-id')
  assert.equal(calls[0].options.headers['X-Line-Retry-Key'], 'retry-id')
  const rejected = createLineClient({ token: 'fixture-token', fetcher: async () => new Response('{}', { status: 409 }) })
  await assert.rejects(rejected.push('fixture-user', [], 'retry-id'), /line_unavailable/)
})

test('LINE quota checks fail closed if totals cannot be verified', async () => {
  const line = createLineClient({ token: 'fixture-token', fetcher: async url => new Response(JSON.stringify(url.endsWith('consumption') ? { totalUsage: 195 } : { type: 'limited', value: 200 })) })
  assert.equal(await line.remaining(), 5)
  const broken = createLineClient({ token: 'fixture-token', fetcher: async () => new Response('{}') })
  await assert.rejects(broken.remaining(), /quota_unavailable/)
})
