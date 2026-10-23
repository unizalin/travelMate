import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { verifySignature, parseLineEvents } from './line-security.mjs'
import { TRIP_PUSH_EXPIRY } from '../../shared/aurora-trip.mjs'

export const hashToken = value => createHash('sha256').update(value).digest('hex')
const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const validLineId = value => typeof value === 'string' && /^U[a-f0-9]{32}$/.test(value)
const text = value => ({ type: 'text', text: value })
const quickReply = { items: ['今日行程', '完整旅程', '天氣／極光', '行前準備', '通知設定'].map(label => ({ type: 'action', action: { type: 'message', label, text: label } })) }

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

export function makeLineHandler({ store, line, authorize, origin, secret, checkNotifications, pushEnabled = false, now = () => new Date() }) {
  const website = `${origin}/iceland`
  const state = binding => ({ linked: !!binding, enabled: pushEnabled && !!binding?.aurora_enabled && !binding.blocked && Date.parse(binding.expires_at) > now().getTime(), blocked: !!binding?.blocked, expiresAt: binding?.expires_at ?? TRIP_PUSH_EXPIRY })
  const linkMessages = async lineId => {
    const token = await line.linkToken(lineId)
    const ticket = randomBytes(32).toString('hex')
    await store.createTicket(hashToken(ticket), lineId, token)
    return [{ type: 'template', altText: '綁定 TravelMate 會員', template: { type: 'buttons', text: '請登入已加入旅程的 TravelMate 帳號，再確認綁定。加好友不會自動開啟通知。', actions: [{ type: 'uri', label: '登入並確認綁定', uri: `${origin}/line/connect?ticket=${ticket}` }] } }]
  }
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
      if (command === '通知設定' || command === '綁定') {
        const binding = await store.bindingForLine(lineId)
        if (!binding) messages = await linkMessages(lineId)
        else messages = [text(`會員已綁定。LINE 極光提醒目前${state(binding).enabled ? '已開啟' : '已關閉'}。\n輸入「開啟極光提醒」「關閉極光提醒」或「解除綁定」。\n網站通知可在網站內另外設定。`)]
      } else if (['開啟極光提醒', '關閉極光提醒', '解除綁定'].includes(command)) {
        const binding = await store.bindingForLine(lineId)
        if (!binding) messages = await linkMessages(lineId)
        else if (command === '解除綁定') {
          await store.unlink(binding.user_id)
          messages = [text('已解除 LINE 會員綁定，LINE 旅行提醒已停止。網站通知可另外設定。')]
        } else if (command === '開啟極光提醒' && !pushEnabled) messages = [text('LINE 極光提醒尚未正式上線或暫停服務，目前無法開啟；請先使用網站查看極光資訊。')]
        else if (!await store.isMember(binding.user_id)) messages = [text('目前沒有旅程存取權限，無法開啟提醒。請在網站確認會員資格。')]
        else {
          await store.setPreference(binding.user_id, command === '開啟極光提醒')
          messages = [text(command === '開啟極光提醒' ? '已開啟 LINE 極光提醒，符合觀測條件時才通知，不保證可見。有效至 2026/11/7 12:00（冰島時間）。' : '已關閉 LINE 極光提醒。網站的裝置通知可另外設定。')]
        }
      } else {
        const date = now().toISOString().slice(0, 10)
        const descriptions = {
          今日行程: date < '2026-10-30' ? '冰島旅程尚未開始，可以先查看完整旅程與行前準備。' : date > '2026-11-07' ? '冰島旅程已結束，仍可在網站查看行程。' : `冰島今天是 ${date}，請開啟網站查看當天安排與最新修改。`,
          完整旅程: '查看冰島九天旅程。共同編輯與私人內容請在網站登入後使用。',
          '天氣／極光': '請在行程頁查看最新天氣與極光資訊；請注意資料時間與現場安全。',
          行前準備: '請開啟網站的「行前準備」。個人行李清單請登入後使用。',
          開啟網站: '開啟 TravelMate，登入後與旅伴共同編輯。',
        }
        messages = [{ ...text(`${Object.hasOwn(descriptions, command) ? descriptions[command] : '請使用下方按鈕查詢行程，或輸入「通知設定」管理 LINE 提醒。'}\n${website}`), quickReply }]
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
      if (action === 'check') return checkNotifications ? await checkNotifications(req, res) : reply(503, { error: 'LINE 提醒尚未啟用。' })
      if (!['status', 'bind', 'enable', 'disable', 'unlink'].includes(action)) return reply(404, { error: '找不到此操作。' })
      const header = req.headers.authorization
      if (typeof header !== 'string' || !header.startsWith('Bearer ')) return reply(401, { error: '請先登入。' })
      const user = await authorize(header.slice(7))
      if (!user) return reply(403, { error: '請使用已加入旅程的會員帳號。' })
      if (action === 'enable' && !pushEnabled) return reply(503, { error: 'LINE 極光提醒尚未正式上線或暫停服務，尚未開啟。' })
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
      if (action === 'enable' || action === 'disable') await store.setPreference(user.id, action === 'enable')
      return reply(200, state(await store.bindingForUser(user.id)))
    } catch (error) {
      if (['invalid_webhook', 'invalid_event', 'body_too_large'].includes(error.message)) return reply(400, { error: '資料格式不符。' })
      if (['membership_required', 'active_link_required', 'link_expired'].some(value => error.message?.includes(value))) return reply(409, { error: '會員資格、綁定或通知期限已變更，請重新確認。' })
      return reply(503, { error: 'LINE 服務暫時無法使用，請重新查看設定結果後再試。' })
    }
  }
}
