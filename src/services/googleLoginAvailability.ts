/** Query only public provider settings; never request Google API access. */
export async function requireGoogleLogin(url: string | undefined, key: string | undefined, request: typeof fetch = fetch): Promise<void> {
  if (!url || !key) throw new Error('尚未設定登入服務，請聯絡旅程建立者。')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await request(`${url.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: key }, signal: controller.signal })
    if (!response.ok) throw new Error('目前無法確認登入服務，請稍後再試。')
    const settings = await response.json()
    if (settings?.external?.google !== true) throw new Error('Google 登入尚未啟用，請旅程建立者完成 Google 與 Supabase 設定。')
  } catch (error) {
    if (controller.signal.aborted) throw new Error('登入服務回應逾時，請稍後再試。')
    if (error instanceof TypeError) throw new Error('無法連線到登入服務，請確認本機 Supabase 已啟動後重試。')
    throw error
  } finally { clearTimeout(timer) }
}
