import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TripPreparation from '@/components/trip/TripPreparation.vue'
import { icelandJourney } from '@/data/icelandJourney'

describe('preparation checklist presentation', () => {
  const values = new Map<string, string>()
  beforeEach(() => {
    values.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('offers checkboxes directly and preserves choices only for the same account and trip', async () => {
    const props = { accountId: 'account-a', tripId: 'fixture', journey: icelandJourney }
    const wrapper = mount(TripPreparation, { props })
    expect(wrapper.find('details').exists()).toBe(false)
    expect(wrapper.get('input[type="checkbox"]').isVisible()).toBe(true)
    expect(wrapper.findAll('h2').map(heading => heading.text())).toContain('緊急資訊')
    expect(wrapper.text()).not.toContain('出發前清單')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    const saved = values.get('tripbook.prep:account-a:fixture')
    expect(saved).toContain('防風防水外層')
    wrapper.unmount()

    const restored = mount(TripPreparation, { props })
    expect(restored.findAll('input:checked')).toHaveLength(1)
    await restored.setProps({ accountId: 'account-b' })
    expect(restored.findAll('input:checked')).toHaveLength(0)
    expect(values.get('tripbook.prep:account-a:fixture')).toBe(saved)
    restored.unmount()
  })

  it('renders a single standalone packing section before the other checklists', () => {
    const wrapper = mount(TripPreparation, {
      props: { accountId: 'account-a', tripId: 'fixture', journey: icelandJourney },
      slots: { 'packing-list': '<div data-testid="packing-list"><h2>行前清單 <small>0/45</small></h2></div>' },
    })
    const sections = wrapper.findAll('section')
    expect(sections[2].classes()).toContain('packing-section')
    expect(sections[2].text()).toContain('行前清單 0/45')
    expect(wrapper.findAll('h2').filter(heading => heading.text().includes('行前清單'))).toHaveLength(1)
    expect(sections[3].text()).toContain('冬季攝影裝備清單')
    wrapper.unmount()
  })
})
