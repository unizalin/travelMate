export function createLineClient({ token, fetcher = fetch }) {
  async function request(path, { method = 'GET', body, retryKey } = {}) {
    const response = await fetcher(`https://api.line.me/v2/bot/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}), ...(retryKey ? { 'X-Line-Retry-Key': retryKey } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(8000),
    })
    if (response.status === 409 && retryKey && response.headers.get('x-line-accepted-request-id')) return {}
    if (!response.ok) throw new Error('line_unavailable')
    return response.json()
  }
  return {
    reply: (replyToken, messages) => request('message/reply', { method: 'POST', body: { replyToken, messages } }),
    push: (to, messages, retryKey) => request('message/push', { method: 'POST', body: { to, messages }, retryKey }),
    linkToken: async userId => {
      if (!/^U[0-9a-f]{32}$/.test(userId)) throw new Error('invalid_line_id')
      const result = await request(`user/${userId}/linkToken`, { method: 'POST' })
      if (typeof result.linkToken !== 'string' || !result.linkToken) throw new Error('line_unavailable')
      return result.linkToken
    },
    remaining: async () => {
      const [quota, consumption] = await Promise.all([request('message/quota'), request('message/quota/consumption')])
      if (quota.type === 'none') return Number.MAX_SAFE_INTEGER
      if (quota.type !== 'limited' || !Number.isSafeInteger(quota.value) || !Number.isSafeInteger(consumption.totalUsage)) throw new Error('quota_unavailable')
      return Math.max(0, quota.value - consumption.totalUsage)
    },
  }
}
