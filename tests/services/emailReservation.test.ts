import { beforeEach, expect, it, vi } from 'vitest'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/services/supabase', () => ({ supabase: { rpc } }))
import { matchEmailReservation, confirmEmailReservation, setEmailReservation, loadAdminState } from '@/services/journeyInviteService'
beforeEach(() => rpc.mockReset())
it('matches through the current auth RPC without accepting a browser supplied email', async () => {
  rpc.mockResolvedValue({ data: { id: 'member-2', name: 'Two' }, error: null })
  expect(await matchEmailReservation('trip')).toEqual({ id: 'member-2', name: 'Two' })
  expect(rpc).toHaveBeenCalledWith('tripbook_match_email_reservation', { p_trip_id: 'trip' })
  rpc.mockResolvedValue({ data: null, error: null })
  expect(await matchEmailReservation('trip')).toBeNull()
})
it('sends admin clear as null and validates confirmation responses', async () => {
  rpc.mockResolvedValue({ data: null, error: null })
  await setEmailReservation('trip', 'member-2', null)
  expect(rpc).toHaveBeenCalledWith('tripbook_set_email_reservation', { p_trip_id: 'trip', p_member_id: 'member-2', p_email: null })
  rpc.mockResolvedValue({ data: { tripId: 'trip' }, error: null })
  expect(await confirmEmailReservation('trip', 'member-2')).toEqual({ tripId: 'trip' })
  rpc.mockResolvedValue({ data: {}, error: null })
  await expect(confirmEmailReservation('trip', 'member-2')).rejects.toThrow('格式無效')
})
it.each([
  ['admin_required', '只有旅程建立者'],
  ['invalid_email', '有效的 Google 信箱'],
  ['email_already_reserved', '已預綁其他身分'],
  ['member_already_claimed', '剛被認領'],
  ['account_already_claimed', '已認領其他身分'],
  ['email_reservation_mismatch', '預綁已變更或信箱不符'],
])('translates %s to an actionable message', async (message, text) => {
  rpc.mockResolvedValue({ data: null, error: { message } })
  await expect(confirmEmailReservation('trip', 'member-2')).rejects.toThrow(text)
})
it('returns reservations only from admin state', async () => {
  rpc.mockResolvedValue({ data: { isAdmin: true, inviteActive: true, members: [{ id: 'member-2', name: 'Two', email: null, claimedAt: null, isOwner: false, reservedEmail: 'fixture@example.test' }] }, error: null })
  const state = await loadAdminState('trip')
  expect(state.isAdmin && state.members[0].reservedEmail).toBe('fixture@example.test')
})
