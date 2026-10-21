import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JourneyRoster from '@/components/trip/JourneyRoster.vue'
const api = vi.hoisted(() => ({ loadRoster: vi.fn(), claimMember: vi.fn(), chooseFlight: vi.fn() }))
vi.mock('@/services/journeyRosterService', () => api)
const tripId = '00000000-0000-0000-0000-000000000001'
const props = { tripId, accountId: 'account-a', canEdit: true, members: [{ id: 'member-1', displayName: '旅伴一' }, { id: 'member-2', displayName: null }] }
const empty = { claims: [], choices: [] }
beforeEach(() => { vi.clearAllMocks(); api.loadRoster.mockResolvedValue(empty) })
describe('identity and own flight selection', () => {
  it('requires cloud journey and does not pretend local preview can claim', async () => {
    const wrapper = mount(JourneyRoster, { props: { ...props, accountId: 'local-preview' } })
    await flushPromises()
    expect(api.loadRoster).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('登入並建立或載入雲端旅程')
    wrapper.unmount()
  })
  it('claims self then selects a flight and only shows that person’s cards', async () => {
    api.claimMember.mockResolvedValue({ claims: [{ memberId: 'member-1', name: '旅伴一', isSelf: true }], choices: [] })
    api.chooseFlight.mockResolvedValue({ claims: [{ memberId: 'member-1', name: '旅伴一', isSelf: true }], choices: [{ memberId: 'member-1', flightId: 'fi0501' }] })
    const wrapper = mount(JourneyRoster, { props })
    await flushPromises()
    expect(wrapper.findAll('button').some(b => b.text() === '我搭這班')).toBe(false)
    await wrapper.findAll('button').find(b => b.text().includes('我是這位'))!.trigger('click')
    await flushPromises()
    expect(api.claimMember).toHaveBeenCalledWith(tripId, 'member-1')
    const fi = wrapper.findAll('article').find(a => a.text().includes('FI0501'))!
    await fi.find('button').trigger('click')
    await flushPromises()
    expect(api.chooseFlight).toHaveBeenCalledWith(tripId, 'fi0501', true)
    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(wrapper.find('article').text()).toContain('台灣')
    expect(wrapper.find('article').text()).toContain('訂位代號：待補')
    wrapper.unmount()
  })
  it('does not allow readonly claim or selecting already claimed identities', async () => {
    api.loadRoster.mockResolvedValue({ claims: [{ memberId: 'member-1', name: '其他人', isSelf: false }], choices: [] })
    const wrapper = mount(JourneyRoster, { props: { ...props, canEdit: false } })
    await flushPromises()
    const claims = wrapper.findAll('button').filter(b => b.text().includes('已認領') || b.text().includes('我是這位'))
    expect(claims).toHaveLength(2)
    expect(claims.every(b => b.attributes('disabled') !== undefined)).toBe(true)
    wrapper.unmount()
  })
  it('discards a roster response after account changes', async () => {
    let resolve!: (value: unknown) => void
    api.loadRoster.mockReturnValueOnce(new Promise(r => { resolve = r })).mockResolvedValueOnce(empty)
    const wrapper = mount(JourneyRoster, { props })
    await flushPromises()
    await wrapper.setProps({ accountId: 'account-b' })
    await flushPromises()
    resolve({ claims: [{ memberId: 'member-1', name: 'OLD_PRIVATE_NAME', isSelf: true }], choices: [] })
    await flushPromises()
    expect(wrapper.text()).not.toContain('OLD_PRIVATE_NAME')
    wrapper.unmount()
  })
})
