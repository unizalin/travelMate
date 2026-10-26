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
    expect(wrapper.text()).toContain('受邀加入旅程')
    wrapper.unmount()
  })
  it('selects flights after invitation-based identity claiming', async () => {
    api.loadRoster.mockResolvedValue({ claims: [{ memberId: 'member-1', name: '旅伴一', isSelf: true }], choices: [] })
    api.chooseFlight.mockResolvedValue({ claims: [{ memberId: 'member-1', name: '旅伴一', isSelf: true }], choices: [{ memberId: 'member-1', flightId: 'fi0501' }] })
    const wrapper = mount(JourneyRoster, { props })
    await flushPromises()
    expect(wrapper.findAll('article')).toHaveLength(0)
    await wrapper.findAll('button').find(b => b.text() === '選擇航班')!.trigger('click')
    const fi = wrapper.findAll('article').find(a => a.text().includes('FI0501'))!
    await fi.find('button').trigger('click')
    await flushPromises()
    expect(api.chooseFlight).toHaveBeenCalledWith(tripId, 'fi0501', true)
    expect(wrapper.findAll('article')).toHaveLength(8)
    expect(wrapper.text()).toContain('已選 1 段')
    expect(wrapper.find('article').text()).toContain('台灣')
    expect(wrapper.find('article').text()).toContain('訂位代號：待補')
    await wrapper.findAll('button').find(b => b.text() === '完成選擇')!.trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(1)
    await wrapper.findAll('button').find(b => b.text() === '更改航班')!.trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(8)
    wrapper.unmount()
  })
  it('keeps only this member’s outbound and return flights in the usual view', async () => {
    api.loadRoster.mockResolvedValue({
      claims: [{ memberId: 'member-1', name: '旅伴一', isSelf: true }, { memberId: 'member-2', name: '旅伴二', isSelf: false }],
      choices: [
        { memberId: 'member-1', flightId: 'fi0501' },
        { memberId: 'member-1', flightId: 'ba801' },
        { memberId: 'member-2', flightId: 'ba802' },
        { memberId: 'member-2', flightId: 'fi0454' },
      ],
    })
    const wrapper = mount(JourneyRoster, { props })
    await flushPromises()
    const cards = wrapper.findAll('article')
    expect(cards).toHaveLength(2)
    expect(cards.map(card => card.text())).toEqual([expect.stringContaining('FI0501'), expect.stringContaining('BA801')])
    expect(wrapper.text()).not.toContain('BA802')
    expect(wrapper.text()).not.toContain('FI0454')
    wrapper.unmount()
  })
  it('does not show an unselected onward flight or its reminder', async () => {
    api.loadRoster.mockResolvedValue({
      claims: [{ memberId: 'member-1', name: '旅伴一', isSelf: true }],
      choices: [{ memberId: 'member-1', flightId: 'fi0454' }],
    })
    const wrapper = mount(JourneyRoster, { props })
    await flushPromises()
    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('CI0082')
    expect(wrapper.text()).not.toContain('直掛')
    wrapper.unmount()
  })
  it('shows Iceland departure and London transfer guidance below the selected flights', async () => {
    api.loadRoster.mockResolvedValue({
      claims: [{ memberId: 'member-1', name: '旅伴一', isSelf: true }],
      choices: [{ memberId: 'member-1', flightId: 'fi0454' }, { memberId: 'member-1', flightId: 'ci0082' }],
    })
    const wrapper = mount(JourneyRoster, { props })
    await flushPromises()
    const guide = wrapper.get('[aria-label="冰島離境注意事項"]')
    expect(guide.text()).toContain('提前 3 小時到 KEF')
    expect(guide.text()).toContain('自行貼標')
    expect(guide.text()).toContain('轉機兩次以上')
    expect(guide.text()).toContain('到 2 樓安檢')
    expect(guide.text()).toContain('護照查驗')
    expect(guide.text()).toContain('人工櫃檯')
    expect(guide.text()).toContain('Direct to Taipei (TPE), please.')
    expect(guide.text()).toContain('Flight Connections')
    expect(guide.text()).toContain('重新報到、托運並安檢')
    expect(guide.text()).toContain('1 小時 45 分')
    expect(wrapper.findAll('article')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Travel Q&A')
    wrapper.unmount()
  })
  it('does not allow readonly claim or selecting already claimed identities', async () => {
    api.loadRoster.mockResolvedValue({ claims: [{ memberId: 'member-1', name: '其他人', isSelf: false }], choices: [] })
    const wrapper = mount(JourneyRoster, { props: { ...props, canEdit: false } })
    await flushPromises()
    const claims = wrapper.findAll('button').filter(b => b.text().includes('已認領') || b.text().includes('我是這位'))
    expect(claims).toHaveLength(0)
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
