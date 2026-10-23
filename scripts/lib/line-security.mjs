import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifySignature(raw, signature, secret) {
  if (!Buffer.isBuffer(raw) || typeof secret !== 'string' || !secret ||
      typeof signature !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false
  const expected = createHmac('sha256', secret).update(raw).digest()
  const received = Buffer.from(signature, 'base64')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export function parseLineEvents(raw) {
  let envelope
  try { envelope = JSON.parse(raw.toString('utf8')) } catch { throw new Error('invalid_webhook') }
  if (!envelope || !Array.isArray(envelope.events) || envelope.events.length > 100 ||
      envelope.events.some(event => !event || typeof event !== 'object' || Array.isArray(event))) {
    throw new Error('invalid_webhook')
  }
  return envelope.events
}
