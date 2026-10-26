import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { verifySignature, parseLineEvents } from './line-security.mjs'
import { TRIP_PUSH_EXPIRY } from '../../shared/aurora-trip.mjs'
import { lineQueryCard, lineNotificationCard } from './line-cards.mjs'

export const hashToken = value => createHash('sha256').update(value).digest('hex')
const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const validLineId = value => typeof value === 'string' && /^U[a-f0-9]{32}$/.test(value)
const text = value => ({ type: 'text', text: value })


async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk)
    size += bytes.length
    if (size > 262144) throw new Error('body_too_large')
    chunks.push(bytes)
  }
  return Buffer.concat(chunks)
}

export function makeLineHandler({ store, line, authorize, origin, secret, loadWeather, now = () => new Date() }) {
  const state = binding => ({ linked: !!binding, enabled: false, blocked: !!binding?.blocked, expiresAt: binding?.expires_at ?? TRIP_PUSH_EXPIRY })
  async function processEvent(event) {
    if (event.source?.type !== 'user' || !validLineId(event.source.userId)) return
    if (typeof event.webhookEventId !== 'string' || event.webhookEventId.length > 128 || !event.webhookEventId.length) throw new Error('invalid_event')
    const owner = randomUUID()
    const lease = await store.event(event.webhookEventId, owner, false)
    if (lease === 'completed') return
    if (lease !== 'claimed') throw new Error('event_busy')
    const lineId = event.source.userId
    if (event.type === 'follow' || event.type === 'unfollow') {
      if (!Number.isSafeInteger(event.timestamp) || event.timestamp < 0) throw new Error('invalid_event')
      await store.block(lineId, event.type === 'unfollow', event.timestamp)
    } else if (event.type === 'accountLink') {
      if (!validToken(event.link?.nonce) || !['ok', 'failed'].includes(event.link?.result)) throw new Error('invalid_event')
      await store.finishLink(hashToken(event.link.nonce), lineId, event.link.result === 'ok')
    } else if (event.type === 'message' && event.message?.type === 'text' && typeof event.message.text === 'string' && typeof event.replyToken === 'string') {
      const command = event.message.text.trim()
      let messages
      if (['通知設定', '綁定', '開啟極光提醒'].includes(command)) {
        messages = [lineNotificationCard(origin)]
      } else if (['關閉極光提醒', '解除綁定'].includes(command)) {
        const binding = await store.bindingForLine(lineId)
        if (!binding) messages = [lineNotificationCard(origin)]
        else if (command === '解除綁定') {
          await store.unlink(binding.user_id)
          messages = [text('已解除 LINE 會員綁定，LINE 旅行提醒已停止。網站通知可另外設定。')]
        }        else if (!await store.isMember(binding.user_id)) messages = [text('目前沒有旅程存取權限，無法開啟提醒。請在網站確認會員資格。')]
        else {
          await store.setPreference(binding.user_id, false)
          messages = [text('已關閉 LINE 極光提醒。網站的裝置通知可另外設定。')]
        }
      } else {
        messages = [await lineQueryCard(command, { origin, now: now(), loadWeather })]
      }
      await line.reply(event.replyToken, messages)
    }
    await store.event(event.webhookEventId, owner, true)
  }
  return async (req, res) => {
    const reply = (status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }); res.end(JSON.stringify(body)) }
    const action = new URL(req.url, origin).searchParams.get('action')
    if (req.method !== 'POST') return reply(405, { error: '不支援此操作。' })
    if (action !== 'webhook' && req.headers.origin && req.headers.origin !== origin) return reply(403, { error: '來源不符。' })
    try {
      const raw = await readBody(req)
      if (action === 'webhook') {
        if (!verifySignature(raw, req.headers['x-line-signature'], secret)) return reply(401, { error: '簽章不符。' })
        const events = parseLineEvents(raw)
        for (const event of events) await processEvent(event)
        return reply(200, { received: true })
      }
      if (action === 'check') return reply(200, { checked: true, sent: 0, mode: 'reply-only' })
      if (!['status', 'bind', 'enable', 'disable', 'unlink'].includes(action)) return reply(404, { error: '找不到此操作。' })
      const header = req.headers.authorization
      if (typeof header !== 'string' || !header.startsWith('Bearer ')) return reply(401, { error: '請先登入。' })
      const user = await authorize(header.slice(7))
      if (!user) return reply(403, { error: '請使用已加入旅程的會員帳號。' })
      if (action === 'enable') return reply(503, { error: 'LINE 已改為查詢回覆，主動提醒已關閉。' })
      let body
      try { body = JSON.parse(raw.toString('utf8')) } catch { return reply(400, { error: '資料格式不符。' }) }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: '資料格式不符。' })
      if (action === 'bind') {
        if (!validToken(body.ticket)) return reply(400, { error: '綁定連結無效，請從 LINE 重新開始。' })
        const nonce = randomBytes(32).toString('hex')
        const token = await store.prepareLink(hashToken(body.ticket), user.id, hashToken(nonce))
        const url = new URL('https://access.line.me/dialog/bot/accountLink')
        url.searchParams.set('linkToken', token); url.searchParams.set('nonce', nonce)
        return reply(200, { redirectUrl: url.toString() })
      }
      if (action === 'unlink') await store.unlink(user.id)
      if (action === 'disable') await store.setPreference(user.id, false)
      return reply(200, state(await store.bindingForUser(user.id)))
    } catch (error) {
      if (['invalid_webhook', 'invalid_event', 'body_too_large'].includes(error.message)) return reply(400, { error: '資料格式不符。' })
      if (['membership_required', 'active_link_required', 'link_expired'].some(value => error.message?.includes(value))) return reply(409, { error: '會員資格、綁定或通知期限已變更，請重新確認。' })
      return reply(503, { error: 'LINE 服務暫時無法使用，請重新查看設定結果後再試。' })
    }
  }
}
