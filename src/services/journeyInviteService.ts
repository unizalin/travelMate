import { supabase } from '@/services/supabase'
export type InviteMember = { id: string; name: string; claimed: boolean }
export type AdminMember = { id: string; name: string; email: string | null; claimedAt: string | null; isOwner: boolean; reservedEmail: string | null }
export type AdminState = { isAdmin: false } | { isAdmin: true; inviteActive: boolean; members: AdminMember[] }
type RpcResult = { data: unknown; error: { message: string } | null }
const rpc = supabase.rpc.bind(supabase) as (name: string, args?: Record<string, unknown>) => PromiseLike<RpcResult>
async function invoke(name: string, args?: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await rpc(name, args)
  if (error) {
    const messages: Record<string, string> = {
      invalid_invitation: '邀請連結已失效，請向建立者索取新連結。',
      member_already_claimed: '這個名字剛被認領，請重新整理後再選擇。',
      account_already_claimed: '這個帳號已認領其他身分，請聯絡建立者協助。',
      admin_required: '只有旅程建立者可以執行此操作。',
      email_already_reserved: '這個信箱已預綁其他身分，請先移除原預綁。',
      invalid_email: '請輸入有效的 Google 信箱。',
      unknown_member: '找不到這個身分，請重新整理。',
      email_reservation_mismatch: '預綁已變更或信箱不符，請聯絡建立者確認。',
      not_authenticated: '請先登入後再確認身分。',
      owner_identity_protected: '建立者的身分不能解除。',
    }
    throw new Error(messages[error.message] ?? '無法完成操作，請稍後重試。')
  }
  return data
}
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('資料格式無效。')
  return value as Record<string, unknown>
}
export async function previewInvite(token: string): Promise<{ members: InviteMember[]; joined: boolean }> {
  const value = record(await invoke('tripbook_invite_preview', { p_token: token }))
  if (!Array.isArray(value.members)) throw new Error('名單格式無效。')
  return { joined: value.joined === true, members: value.members.map(item => {
    const m = record(item)
    if (typeof m.id !== 'string' || typeof m.name !== 'string' || typeof m.claimed !== 'boolean') throw new Error('名單格式無效。')
    return { id: m.id, name: m.name, claimed: m.claimed }
  }) }
}
export async function joinInvite(token: string, memberId: string): Promise<{ tripId: string }> {
  const value = record(await invoke('tripbook_join_invite', { p_token: token, p_member_id: memberId }))
  if (typeof value.tripId !== 'string') throw new Error('旅程資料格式無效。')
  return { tripId: value.tripId }
}
export async function loadAdminState(tripId: string): Promise<AdminState> {
  const value = record(await invoke('tripbook_admin_state', { p_trip_id: tripId }))
  if (value.isAdmin !== true) return { isAdmin: false }
  if (typeof value.inviteActive !== 'boolean' || !Array.isArray(value.members)) throw new Error('管理資料格式無效。')
  return { isAdmin: true, inviteActive: value.inviteActive, members: value.members.map(item => {
    const m = record(item)
    if (typeof m.id !== 'string' || typeof m.name !== 'string' || (m.email !== null && typeof m.email !== 'string') || (m.claimedAt !== null && typeof m.claimedAt !== 'string') || typeof m.isOwner !== 'boolean' || (m.reservedEmail != null && typeof m.reservedEmail !== 'string')) throw new Error('管理名單格式無效。')
    return { id: m.id, name: m.name, email: m.email, claimedAt: m.claimedAt, isOwner: m.isOwner, reservedEmail: typeof m.reservedEmail === 'string' ? m.reservedEmail : null }
  }) }
}
export async function rotateInvite(tripId: string): Promise<string> {
  const value = await invoke('tripbook_rotate_invite', { p_trip_id: tripId })
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error('邀請資料格式無效。')
  return value
}
export const revokeInvite = (tripId: string) => invoke('tripbook_revoke_invite', { p_trip_id: tripId })
export const removeMember = (tripId: string, memberId: string) => invoke('tripbook_remove_member', { p_trip_id: tripId, p_member_id: memberId })

export const setEmailReservation = (tripId: string, memberId: string, email: string | null) =>
  invoke('tripbook_set_email_reservation', { p_trip_id: tripId, p_member_id: memberId, p_email: email })
export type ReservedIdentity = { id: string; name: string }
export async function matchEmailReservation(tripId: string): Promise<ReservedIdentity | null> {
  const data = await invoke('tripbook_match_email_reservation', { p_trip_id: tripId })
  if (data === null) return null
  const value = record(data)
  if (typeof value.id !== 'string' || typeof value.name !== 'string') throw new Error('身分資料格式無效。')
  return { id: value.id, name: value.name }
}
export async function confirmEmailReservation(tripId: string, memberId: string): Promise<{ tripId: string }> {
  const value = record(await invoke('tripbook_confirm_email_reservation', { p_trip_id: tripId, p_member_id: memberId }))
  if (typeof value.tripId !== 'string') throw new Error('旅程資料格式無效。')
  return { tripId: value.tripId }
}
