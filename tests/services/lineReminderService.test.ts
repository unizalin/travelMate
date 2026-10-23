import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('@/services/supabase', () => ({ supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'fixture-token' } }, error: null })) } } }))

beforeEach(() => { vi.unstubAllGlobals() })

it('does not treat malformed or failed LINE settings as enabled', async () => {
  const { lineState } = await import('@/services/lineReminderService')
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ enabled: true }) })))
  await expect(lineState()).rejects.toThrow('回應無效')
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: '尚未連線' }) })))
  await expect(lineState()).rejects.toThrow('尚未連線')
})

it('accepts only the official LINE account-link redirect', async () => {
  const { prepareLineLink } = await import('@/services/lineReminderService')
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ redirectUrl: 'https://evil.test/dialog/bot/accountLink' }) })))
  await expect(prepareLineLink('a'.repeat(64))).rejects.toThrow('綁定回應無效')
  const url = `https://access.line.me/dialog/bot/accountLink?linkToken=test&nonce=${'b'.repeat(64)}`
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ redirectUrl: url }) })))
  expect((await prepareLineLink('a'.repeat(64))).toString()).toBe(url)
})
