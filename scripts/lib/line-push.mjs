import { randomUUID } from 'node:crypto'
import { notificationNight, loadSources, eligibleAuroraWindow } from './aurora-push.mjs'
import { tripNightCity, TRIP_PUSH_EXPIRY } from '../../shared/aurora-trip.mjs'

export async function checkLineSubscribers({ store, line, origin, now = new Date(), load = loadSources }) {
  const night = notificationNight(now), city = tripNightCity(night)
  if (!city || now.getTime() >= Date.parse(TRIP_PUSH_EXPIRY)) return { checked: true, sent: 0 }
  const owner = randomUUID()
  if (!await store.acquire(owner)) throw new Error('worker_busy')
  let sent = 0
  try {
    let remaining = await line.remaining()
    if (remaining < 1) return { checked: true, sent }
    let sources
    try { sources = await load(city, night) } catch { return { checked: true, sent } }
    if (!eligibleAuroraWindow({ ...sources, now, nightDate: night })) return { checked: true, sent }
    for (const binding of await store.subscribers()) {
      if (remaining < 1) break
      const delivery = await store.claimDelivery(binding.user_id, binding.link_id, night)
      if (!delivery) continue
      try {
        await line.push(delivery.lineUserId, [{ type: 'text', text: `今晚極光值得留意。接下來三小時有雲量較少、活動值得留意的時段；不保證可見，請查看最新條件並留意現場安全。\n${origin}/iceland` }], delivery.retryKey)
        remaining--; sent++
        await store.sent(binding.user_id, night)
      } catch {
        // Unknown delivery results keep the same retry key for the next check.
      }
    }
    return { checked: true, sent }
  } finally { await store.release(owner) }
}
