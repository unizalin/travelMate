import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../../scripts/lib/line-runtime.mjs'

test('production cron cannot send even if the legacy environment switch is true', async () => {
  const previousSecret = process.env.CRON_SECRET, previousSwitch = process.env.LINE_PUSH_ENABLED
  process.env.CRON_SECRET = 'runtime-test-secret'
  process.env.LINE_PUSH_ENABLED = 'true'
  try {
    let status, body
    await handler({ url: '/api/line?action=check', headers: { authorization: 'Bearer runtime-test-secret' } }, { writeHead: code => { status = code }, end: text => { body = JSON.parse(text) } })
    assert.equal(status, 200)
    assert.deepEqual(body, { checked: true, sent: 0, mode: 'reply-only' })
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previousSecret
    if (previousSwitch === undefined) delete process.env.LINE_PUSH_ENABLED; else process.env.LINE_PUSH_ENABLED = previousSwitch
  }
})
