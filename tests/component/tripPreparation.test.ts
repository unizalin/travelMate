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
    const props = { accountId: 'account-a', tripId: 'fixture', journey: icelandJourney, accountTools: true }
    const wrapper = mount(TripPreparation, { props })
    expect(wrapper.find('details').exists()).toBe(true)
    expect(wrapper.findAll('input[type="checkbox"]').length).toBeGreaterThan(0)
    expect(wrapper.findAll('h2').map(heading => heading.text())).toContain('離線行程')
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

  it('orders emergency, reservations, currency and the shared packing template', () => {
    const wrapper = mount(TripPreparation, {
      props: { accountId: 'account-a', tripId: 'fixture', journey: icelandJourney },
      slots: { 'packing-list': '<div data-testid="packing-list"><h2>行前清單 <small>0/45</small></h2></div>' },
    })
    expect(wrapper.text()).toContain('最近醫院：待補')
    const sections = wrapper.findAll('section')
    expect(wrapper.get('.packing-section').exists()).toBe(true)
    expect(wrapper.get('.packing-section').text()).toContain('行前清單 0/45')
    expect(wrapper.findAll('h2').filter(heading => heading.text().includes('行前清單'))).toHaveLength(1)
    expect(sections.map(section=>section.text()).find(text=>text.includes('ISK 即時匯率'))).toBeDefined()
    const map=wrapper.get('a[href*="maps/d/"]')
    expect(map.attributes('target')).toBe('_blank')
    expect(map.element.closest('section')?.textContent).toContain('下載冰島離線地圖')
    expect(map.element.closest('.packing-section')).toBe(null)
    expect(wrapper.text()).not.toContain('冬季攝影裝備清單')
    wrapper.unmount()
  })
})
