export type LineState = { linked: boolean; enabled: boolean; blocked: boolean; expiresAt: string }

async function request(action: string, body: object = {}): Promise<unknown> {
  const { supabase } = await import('@/services/supabase')
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error('請先登入 TravelMate。')
  const response = await fetch(`/api/line?action=${action}`, {
    method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(12000),
  })
  const value: unknown = await response.json()
  if (!response.ok) throw new Error(value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : 'LINE 設定結果未確認，請重新查詢。')
  return value
}

export async function lineState(action: 'status' | 'enable' | 'disable' | 'unlink' = 'status'): Promise<LineState> {
  const value = await request(action)
  if (!value || typeof value !== 'object' || !('linked' in value) || typeof value.linked !== 'boolean' ||
      !('enabled' in value) || typeof value.enabled !== 'boolean' || !('blocked' in value) || typeof value.blocked !== 'boolean' ||
      !('expiresAt' in value) || typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt))) throw new Error('LINE 設定回應無效，請重新查詢。')
  return { linked: value.linked, enabled: value.enabled, blocked: value.blocked, expiresAt: value.expiresAt }
}

export async function prepareLineLink(ticket: string): Promise<URL> {
  if (!/^[a-f0-9]{64}$/.test(ticket)) throw new Error('綁定連結無效，請從 LINE 重新開始。')
  const value = await request('bind', { ticket })
  if (!value || typeof value !== 'object' || !('redirectUrl' in value) || typeof value.redirectUrl !== 'string') throw new Error('LINE 綁定回應無效。')
  let url: URL
  try { url = new URL(value.redirectUrl) } catch { throw new Error('LINE 綁定回應無效。') }
  if (url.origin !== 'https://access.line.me' || url.pathname !== '/dialog/bot/accountLink' || url.username || url.password ||
      !/^[a-f0-9]{64}$/.test(url.searchParams.get('nonce') ?? '') || !url.searchParams.get('linkToken')) throw new Error('LINE 綁定回應無效。')
  return url
}
