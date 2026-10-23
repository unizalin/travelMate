import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import LineReminderSettings from '@/components/trip/LineReminderSettings.vue'
import { lineState } from '@/services/lineReminderService'

vi.mock('@/services/lineReminderService', () => ({ lineState: vi.fn(), prepareLineLink: vi.fn() }))
const disabled = { linked: true, enabled: false, blocked: false, expiresAt: '2026-11-07T12:00:00Z' }
beforeEach(() => { vi.mocked(lineState).mockReset() })

it('only reports enabled after the server confirms the saved setting', async () => {
  vi.mocked(lineState).mockResolvedValueOnce(disabled).mockRejectedValueOnce(new Error('未確認'))
  const wrapper = mount(LineReminderSettings, { props: { accountId: 'member' } })
  await flushPromises()
  const enable = wrapper.findAll('button').find(button => button.text() === '開啟 LINE 極光提醒')
  expect(enable).toBeDefined()
  await enable?.trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('未確認')
  expect(wrapper.text()).not.toContain('LINE 極光提醒已開啟')
})

it('does not apply a previous account response after switching accounts', async () => {
  let resolveOld: (value: typeof disabled) => void = () => {}
  vi.mocked(lineState).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
  vi.mocked(lineState).mockResolvedValue({ ...disabled, linked: false })
  const wrapper = mount(LineReminderSettings, { props: { accountId: 'first' } })
  await wrapper.setProps({ accountId: 'second' }); await flushPromises()
  resolveOld({ ...disabled, enabled: true }); await flushPromises()
  expect(wrapper.text()).toContain('尚未綁定')
  expect(wrapper.text()).not.toContain('LINE 極光提醒已開啟')
})

it('requires an explicit confirmation for a LINE binding ticket', async () => {
  vi.mocked(lineState).mockResolvedValue({ ...disabled, linked: false })
  const wrapper = mount(LineReminderSettings, { props: { accountId: 'member', ticket: 'a'.repeat(64) } })
  await flushPromises()
  expect(wrapper.text()).toContain('確認綁定這個會員')
  expect(wrapper.text()).toContain('不會自動開啟提醒')
})
