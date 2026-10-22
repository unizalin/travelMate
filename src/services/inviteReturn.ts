const KEY = 'tripbook-invite-return'
export function safeInvitePath(path: unknown): string | null {
  if (typeof path !== 'string') return null
  const match = /^\/iceland\/join\?token=([a-f0-9]{64})$/.exec(path)
  return match ? path : null
}
export function rememberInvite(path: string): void {
  const safe = safeInvitePath(path)
  if (safe) sessionStorage.setItem(KEY, safe)
}
export function pendingInvite(): string | null {
  return safeInvitePath(sessionStorage.getItem(KEY))
}
export function clearInvite(): void { sessionStorage.removeItem(KEY) }
