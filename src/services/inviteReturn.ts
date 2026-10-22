const KEY = 'tripbook-invite-return'
export function safeInvitePath(path: unknown): string | null {
  if (typeof path !== 'string') return null
  const match = /^\/iceland\/join\?token=([a-f0-9]{64})$/.exec(path)
  return match ? path : null
}
export function rememberInvite(path: string): void {
  const safe = safeInvitePath(path)
  if (safe) { try { sessionStorage.setItem(KEY, safe) } catch { /* OAuth next carries the same destination when storage is unavailable. */ } }
}
export function pendingInvite(): string | null {
  try { return safeInvitePath(sessionStorage.getItem(KEY)) } catch { return null }
}
export function clearInvite(): void { try { sessionStorage.removeItem(KEY) } catch { /* Storage may be disabled. */ } }
