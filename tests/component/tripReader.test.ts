import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TripReader from '@/components/trip/TripReader.vue'
import { icelandJourney } from '@/data/icelandJourney'

describe('TripReader', () => {
  it('renders the complete public itinerary without private people or participant fields', () => {
    const wrapper = mount(TripReader, { props: { publicOnly: true } })

    expect(wrapper.text()).toContain('Kirkjufellsfoss')
    expect(wrapper.text()).toContain('Skaftafells Glacier TOUR')
    expect(wrapper.text()).toContain('Blue Lagoon')
    expect(wrapper.text()).toContain('Costco Wholesale Iceland')
    expect(wrapper.text()).toContain('BA802')
    expect(wrapper.text()).toContain('Blue Lagoon 與 11:55')
    expect(wrapper.text()).toContain('6 位旅伴 · 名單待確認')
    expect(wrapper.text()).not.toContain('Hótel Jökulsárlón - Glacier Lagoon Hotel')
    expect(wrapper.text()).not.toContain('拍攝提示')
    expect(wrapper.text()).not.toContain('成員 1')
    expect(wrapper.text()).not.toContain('member-1')
    expect(wrapper.findAll('a').some(link => link.text().includes('開啟規劃'))).toBe(false)
  })

  it('does not expose a planning link in public mode even with a private journey supplied', () => {
    const privateJourney = {
      ...icelandJourney,
      members: [{ ...icelandJourney.members[0], displayName: '私人姓名' }, ...icelandJourney.members.slice(1)],
    }
    const wrapper = mount(TripReader, { props: { journey: privateJourney, publicOnly: true } })

    expect(wrapper.text()).not.toContain('私人姓名')
    expect(wrapper.findAll('a').some(link => link.text().includes('開啟規劃'))).toBe(false)
  })

  it('keeps accommodation details and photography tips in the private reader only', async () => {
    const wrapper = mount(TripReader, {
      props: { journey: icelandJourney, publicOnly: false },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })

    expect(wrapper.text()).toContain('Hótel Jökulsárlón - Glacier Lagoon Hotel')
    const novemberFirst = wrapper.findAll('button').find(button => button.text().includes('11月1日'))
    expect(novemberFirst).toBeDefined()
    await novemberFirst!.trigger('click')
    expect(wrapper.text()).toContain('拍攝提示')
    expect(wrapper.text()).toContain('6 位旅伴')
    expect(wrapper.text()).toContain('配對待確認')
  })
})
