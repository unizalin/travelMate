import { describe, expect, it, vi } from 'vitest'
import { requireGoogleLogin } from '@/services/googleLoginAvailability'
describe('Google provider readiness', () => {
  it('blocks missing or disabled configuration before OAuth', async () => {
    const request = vi.fn()
    await expect(requireGoogleLogin(undefined, undefined, request)).rejects.toThrow('尚未設定')
    expect(request).not.toHaveBeenCalled()
    request.mockResolvedValue(new Response(JSON.stringify({ external: { google: false } })))
    await expect(requireGoogleLogin('http://local.test', 'public-key', request)).rejects.toThrow('尚未啟用')
  })
  it('accepts an enabled provider and fails closed on HTTP errors', async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ external: { google: true } })))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
    await expect(requireGoogleLogin('http://local.test', 'public-key', request)).resolves.toBeUndefined()
    await expect(requireGoogleLogin('http://local.test', 'public-key', request)).rejects.toThrow('無法確認')
  })
  it('explains when the local auth service cannot be reached', async () => {
    const request = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(requireGoogleLogin('http://local.test', 'public-key', request)).rejects.toThrow('無法連線到登入服務')
  })
})
