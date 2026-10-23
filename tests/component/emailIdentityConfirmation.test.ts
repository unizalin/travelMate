import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import EmailIdentityConfirmation from '@/components/trip/EmailIdentityConfirmation.vue'
const api = vi.hoisted(() => ({ matchEmailReservation: vi.fn(), confirmEmailReservation: vi.fn() }))
vi.mock('@/services/journeyInviteService', () => api)
beforeEach(() => {
  vi.clearAllMocks()
  api.matchEmailReservation.mockResolvedValue({ id: 'member-2', name: 'Fixture Two' })
  api.confirmEmailReservation.mockResolvedValue({ tripId: 'trip' })
})
it('shows only the matched identity and declining performs no write', async () => {
  const wrapper = mount(EmailIdentityConfirmation, { props: { tripId: 'trip', accountId: 'account' } })
  await flushPromises()
  expect(wrapper.text()).toContain('你的信箱已被預留為 Fixture Two，確認這是你的身分嗎？')
  expect(api.confirmEmailReservation).not.toHaveBeenCalled()
  await wrapper.get('[data-test="decline-email-identity"]').trigger('click')
  expect(api.confirmEmailReservation).not.toHaveBeenCalled()
  expect(wrapper.find('section').exists()).toBe(false)
  expect(wrapper.emitted('offered')?.at(-1)).toEqual([false])
  wrapper.unmount()
})
it('writes only after explicit confirmation and reports a claim conflict', async () => {
  const wrapper = mount(EmailIdentityConfirmation, { props: { tripId: 'trip', accountId: 'account' } })
  await flushPromises()
  api.confirmEmailReservation.mockRejectedValueOnce(new Error('這個名字剛被認領，請重新整理後再選擇。'))
  await wrapper.get('[data-test="confirm-email-identity"]').trigger('click'); await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('剛被認領')
  expect(wrapper.emitted('joined')).toBeUndefined()
  await wrapper.get('[data-test="confirm-email-identity"]').trigger('click'); await flushPromises()
  expect(api.confirmEmailReservation).toHaveBeenCalledWith('trip', 'member-2')
  expect(wrapper.emitted('joined')).toEqual([['trip']])
  wrapper.unmount()
})
it('does not expose a stale match or join completion after switching accounts', async () => {
  let resolve!: (value: { id: string; name: string }) => void
  api.matchEmailReservation.mockReturnValueOnce(new Promise(r => { resolve = r }))
  const wrapper = mount(EmailIdentityConfirmation, { props: { tripId: 'trip', accountId: 'old' } })
  api.matchEmailReservation.mockResolvedValueOnce(null)
  await wrapper.setProps({ accountId: 'new' }); await flushPromises()
  resolve({ id: 'member-2', name: 'Old Name' }); await flushPromises()
  expect(wrapper.text()).not.toContain('Old Name')
  expect(api.confirmEmailReservation).not.toHaveBeenCalled()
  wrapper.unmount()
})
