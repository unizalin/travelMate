vi.mock('@/services/tripWeatherService', () => ({ loadDayForecast: async () => ({ kind: 'unavailable', fetchedAt: new Date().toISOString() }) }))
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TripReader from '@/components/trip/TripReader.vue'
import { icelandJourney } from '@/data/icelandJourney'

describe('TripReader', () => {
  it('opens the current Iceland day in a private journey', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-03T12:00:00Z'))
    const wrapper = mount(TripReader, {
      props: { journey: icelandJourney, publicOnly: false },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.get('#day-tab-2026-11-03').attributes('aria-selected')).toBe('true')
    wrapper.unmount()
    vi.useRealTimers()
  })

  it('keeps both local and Taiwan clocks visible in the compact header', async () => {
    const wrapper = mount(TripReader)
    const clocks = wrapper.find('.journey-header .clocks')
    expect(clocks.text()).toContain('倫敦')
    expect(clocks.text()).toContain('台灣')
    await wrapper.get('#leg-tab-iceland').trigger('click')
    expect(wrapper.find('.journey-header .clocks').text()).toContain('冰島')
    wrapper.unmount()
  })

  it('renders the complete public itinerary without private people or participant fields', async () => {
    const wrapper = mount(TripReader, { props: { publicOnly: true } })
    await wrapper.get('#leg-tab-iceland').trigger('click')
    for (const [date, name] of [['2026-10-31', 'Ytri Tunga'], ['2026-10-31', 'Ingjaldshólskirkja'], ['2026-11-04', 'Hali Blue Ice Cave Adventure'], ['2026-11-05', 'Zodiac Boat Tour'], ['2026-11-06', 'Volcano TOUR'], ['2026-11-07', 'Blue Lagoon'], ['2026-10-30', 'Costco Wholesale Iceland']]) {
      await wrapper.get(`#day-tab-${date}`).trigger('click')
      expect(wrapper.text()).toContain(name)
    }
    await wrapper.get('#view-tab-more').trigger('click')
    expect(wrapper.text()).not.toContain('Víkurkirkja')
    expect(wrapper.text()).not.toContain('Stjórnarfoss（可選）')
    expect(wrapper.text()).not.toContain('Skaftafells Glacier TOUR')
    expect(wrapper.text()).toContain('Blue Lagoon')
    expect(wrapper.text()).toContain('BA802')
    expect(wrapper.text()).toContain('行程已確認')
    expect(wrapper.text()).not.toContain('公開')
    await wrapper.get('#view-tab-flights').trigger('click')
    expect(wrapper.text()).toContain('BR068')
    expect(wrapper.text()).toContain('6 人')
    expect(wrapper.text()).not.toContain('Hótel Jökulsárlón - Glacier Lagoon Hotel')
    expect(wrapper.text()).not.toContain('拍攝提示')
    expect(wrapper.text()).not.toContain('成員 1')
    expect(wrapper.text()).not.toContain('member-1')
    expect(wrapper.text()).not.toContain('共用 Memo')
    expect(wrapper.findAll('a').some(link => link.text().includes('開啟規劃'))).toBe(false)
  })

  it('does not expose private fields through the shared activity rows or a planning link', async () => {
    const privateJourney = {
      ...icelandJourney,
      members: [{ ...icelandJourney.members[0], displayName: '私人姓名' }, ...icelandJourney.members.slice(1)],
      items: icelandJourney.items.map(item => ({ ...item, notes: 'PRIVATE_NOTE_SENTINEL', reminder: 'PRIVATE_REMINDER_SENTINEL', photoTip: 'PRIVATE_PHOTO_SENTINEL' })),
      memos: { 'iceland-stop-1': { content: 'PRIVATE_MEMO_SENTINEL', updatedBy: 'private-actor', updatedByName: 'Private Actor', updatedAt: '2026-10-15T01:00:00Z' } },
    }
    const wrapper = mount(TripReader, { props: { journey: privateJourney, publicOnly: true } })

    await wrapper.get('#leg-tab-iceland').trigger('click')
    await wrapper.get('#day-tab-2026-10-30').trigger('click')
    expect(wrapper.findAll('.public-activities .activity').length).toBeGreaterThan(0)
    expect(wrapper.get('.public-activities .activity-map').attributes('href')).toContain('google.com/maps/search')
    expect(wrapper.text()).not.toMatch(/PRIVATE_NOTE_SENTINEL|PRIVATE_REMINDER_SENTINEL|PRIVATE_PHOTO_SENTINEL/)
    expect(wrapper.text()).not.toContain('私人姓名')
    expect(wrapper.text()).not.toContain('PRIVATE_MEMO_SENTINEL')
    expect(wrapper.text()).not.toContain('Private Actor')
    expect(wrapper.findAll('a').some(link => link.text().includes('開啟規劃'))).toBe(false)
  })

  it('keeps photography tips in the private reader', async () => {
    const wrapper = mount(TripReader, {
      props: { journey: icelandJourney, publicOnly: false },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })

    await wrapper.get('#view-tab-more').trigger('click')
    await wrapper.get('#view-tab-daily').trigger('click')
    const novemberFirst = wrapper.findAll('button').find(button => button.attributes('aria-label')?.includes('11月1日'))
    expect(novemberFirst).toBeDefined()
    await novemberFirst!.trigger('click')
    expect(wrapper.text()).toContain('拍攝提示')
    expect(wrapper.text()).toContain('6 人')
    expect(wrapper.text()).not.toContain('配對待確認')
  })

  it('shows only the selected date photo-book Plan B and no broad overview card', async () => {
    const wrapper = mount(TripReader, { props: { publicOnly: true } })
    const planB = () => wrapper.find('[aria-label="今日應變"]')
    await wrapper.get('#leg-tab-iceland').trigger('click')
    await wrapper.get('#day-tab-2026-10-30').trigger('click')
    expect(wrapper.find('[aria-label="建議行程節奏"]').exists()).toBe(false)
    expect(planB().text()).toContain('取車檢查、Costco 採買、提早休息')
    expect(planB().text()).not.toContain('依業者通知調整銜接')
    await wrapper.findAll('[role="tab"]').find(tab => tab.attributes('aria-label')?.includes('11月2日'))!.trigger('click')
    expect(planB().text()).toContain('Dyrhólaey')
    expect(planB().text()).not.toContain('Plane Wreck')
    expect(wrapper.text()).not.toMatch(/Plane Wreck|Víkurkirkja/)
    await wrapper.findAll('[role="tab"]').find(tab => tab.attributes('aria-label')?.includes('11月4日'))!.trigger('click')
    expect(planB().text()).toContain('Blue Ice Cave Adventure')
    expect(planB().text()).not.toContain('09:00–15:00')
    await wrapper.findAll('[role="tab"]').find(tab => tab.attributes('aria-label')?.includes('11月7日'))!.trigger('click')
    expect(planB().text()).toContain('Blue Lagoon')
    expect(planB().text()).not.toContain('Blue Ice Cave Adventure')
    wrapper.unmount()
  })

  it('does not impose handbook guidance on an existing private draft', () => {
    const wrapper = mount(TripReader, {
      props: { journey: icelandJourney, publicOnly: false },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.find('[aria-label="建議行程節奏"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('switches reader views and keeps multiple arrival flight options together', async () => {
    const wrapper = mount(TripReader, { props: { publicOnly: true } })
    expect(wrapper.find('#view-daily').isVisible()).toBe(true)
    expect(wrapper.find('#view-preparation').exists()).toBe(false)
    expect(wrapper.find('#view-flights').exists()).toBe(false)
    await wrapper.get('#leg-tab-iceland').trigger('click')
    await wrapper.get('#day-tab-2026-10-30').trigger('click')
    expect(wrapper.find('[aria-label="當日航班方案"]').text()).toContain('FI0501')
    expect(wrapper.find('[aria-label="當日航班方案"]').text()).toContain('BA802')
    await wrapper.find('#view-tab-more').trigger('click')
    expect(wrapper.find('#view-tab-more').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('#view-preparation').exists()).toBe(true)
    expect(wrapper.find('#view-daily').exists()).toBe(false)
    await wrapper.find('#view-tab-flights').trigger('click')
    expect(wrapper.find('#view-flights').exists()).toBe(true)
    expect(wrapper.find('#view-daily').exists()).toBe(false)
    expect(wrapper.find('#view-preparation').exists()).toBe(false)
    expect(wrapper.find('#view-flights').text()).toContain('CI0073')
    expect(wrapper.find('#view-flights').text()).toContain('2026-11-08')
    expect(wrapper.find('#view-flights').text()).toContain('FI0454')
    expect(wrapper.find('#view-flights .private-stay').exists()).toBe(false)
    expect(wrapper.findAll('#view-flights .flight-card').length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('renders the trip-period public aurora card only when an Iceland date is selected', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T12:00:00Z'))
    const wrapper = mount(TripReader, { props: { publicOnly: true } })

    const disclosure = wrapper.find('.global-information [aria-labelledby="aurora-heading"]')
    expect(disclosure.exists()).toBe(true)
    expect(disclosure.find('[aria-expanded="false"]').exists()).toBe(true)
    expect(disclosure.text()).toContain('今晚極光')
    expect(disclosure.find('.aurora-conditions__body').exists()).toBe(false)
    expect(disclosure.text()).not.toContain('member-1')
    expect(disclosure.text()).not.toContain('Supabase')
    await wrapper.get('#leg-tab-london').trigger('click')
    await wrapper.get('#day-tab-2026-10-29').trigger('click')
    expect(wrapper.find('[aria-labelledby="aurora-heading"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="天氣與出門準備"]').exists()).toBe(false)
    await wrapper.get('#leg-tab-iceland').trigger('click')
    await wrapper.get('#day-tab-2026-11-01').trigger('click')
    expect(wrapper.find('[aria-labelledby="aurora-heading"]').exists()).toBe(true)
    wrapper.unmount()
    vi.useRealTimers()
  })

  it('keeps the aurora card hidden before the Iceland trip period', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-20T12:00:00Z'))
    const wrapper = mount(TripReader, { props: { publicOnly: true } })
    expect(wrapper.find('.global-information [aria-labelledby="aurora-heading"]').exists()).toBe(false)
    wrapper.unmount()
    vi.useRealTimers()
  })
})
