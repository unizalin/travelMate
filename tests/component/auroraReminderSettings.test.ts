import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuroraReminderSettings from '@/components/trip/AuroraReminderSettings.vue'
const mocks = vi.hoisted(() => ({ support: vi.fn(), config: vi.fn(), registration: vi.fn(), status: vi.fn(), enable: vi.fn(), disable: vi.fn() }))
vi.mock('@/services/auroraPushService', () => ({ deviceNotificationSupport: mocks.support, getPushConfig: mocks.config, preparePushRegistration: mocks.registration, currentPushState: mocks.status, enableAuroraPush: mocks.enable, disableAuroraPush: mocks.disable }))
vi.mock('@/composables/useDeviceReminders',async()=>{
 const {ref,computed}=await import('vue')
 return {useDeviceReminders:()=>{
  const state=ref({enabled:false,scope:'tonight',expiresAt:''})
  return {state,expired:ref(false),enabled:computed(()=>state.value.enabled && state.value.scope==='trip'),tonightCity:ref('Vík'),refresh:async()=>{state.value=await mocks.status()}}
 }}
})
beforeEach(() => {
 vi.resetAllMocks()
 mocks.support.mockReturnValue('ready')
 mocks.config.mockResolvedValue({ publicKey: 'test', local: true })
 mocks.registration.mockResolvedValue({})
 mocks.status.mockResolvedValue({ enabled: false })
})
describe('Trip device reminders', () => {
 it('waits for a user click and never claims success after subscription fails', async () => {
  mocks.enable.mockRejectedValue(new Error('尚未允許通知，整趟提醒未啟用。'))
  const wrapper = mount(AuroraReminderSettings, { props: { accountId: 'account-1' } })
  await flushPromises()
  expect(mocks.enable).not.toHaveBeenCalled()
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('整趟提醒未啟用')
  expect(wrapper.find('.enabled').exists()).toBe(false)
  wrapper.unmount()
 })
 it('keeps the enable button disabled when the service is offline', async () => {
  mocks.config.mockRejectedValue(new Error('提醒服務尚未連線'))
  const wrapper = mount(AuroraReminderSettings, { props: { accountId: 'account-1' } })
  await flushPromises()
  expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  expect(wrapper.find('.enabled').exists()).toBe(false)
  expect(mocks.registration).not.toHaveBeenCalled()
  wrapper.unmount()
 })
 it('explains iPhone home screen setup without starting a subscription', async () => {
  mocks.support.mockReturnValue('home-screen-required')
  const wrapper = mount(AuroraReminderSettings, { props: { accountId: 'account-1' } })
  await flushPromises()
  expect(wrapper.text()).toContain('加入主畫面')
  expect(mocks.config).not.toHaveBeenCalled()
  expect(mocks.enable).not.toHaveBeenCalled()
  wrapper.unmount()
 })
})
