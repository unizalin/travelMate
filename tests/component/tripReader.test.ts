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
    await wrapper.get('#leg-tab-london').trigger('click')
    const clocks = wrapper.find('.global-information .clocks')
    expect(clocks.text()).toContain('倫敦')
    expect(clocks.text()).toContain('台灣')
    await wrapper.get('#leg-tab-iceland').trigger('click')
    expect(wrapper.find('.global-information .clocks').text()).toContain('冰島')
    wrapper.unmount()
  })

  it('renders the complete public itinerary without private people or participant fields', async () => {
    const wrapper = mount(TripReader, { props: { publicOnly: true } })
    await wrapper.get('#leg-tab-iceland').trigger('click')
    for (const [date, name] of [['2026-10-31', 'Ytri Tunga'], ['2026-10-31', 'Ingjaldshólskirkja'], ['2026-11-04', 'Hali Blue Ice Cave Adventure'], ['2026-11-05', 'Zodiac Boat Tour'], ['2026-11-06', 'Volcano TOUR'], ['2026-11-07', 'Blue Lagoon'], ['2026-10-30', 'Costco Wholesale Iceland']]) {
      await wrapper.get(`#day-tab-${date}`).trigger('click')
      expect(wrapper.text()).toContain(name)
    }
    expect(wrapper.find('.journey-navigation').exists()).toBe(false)
    expect(wrapper.find('#view-preparation').exists()).toBe(false)
    expect(wrapper.find('#view-flights').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/Hótel|member-1|共用 Memo|成員 1/)
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

  it('forces public deep links to itinerary without rendering member sections', async () => {
    const wrapper = mount(TripReader, { props: { publicOnly: true, section: 'flights' }, slots: { flights: '<p>PRIVATE_FLIGHTS</p>', preparation: '<p>PRIVATE_PACKING</p>', me: '<p>PRIVATE_ACCOUNT</p>' } })
    for (const section of ['flights', 'more', 'me']) {
      await wrapper.setProps({section})
      expect(wrapper.find('#view-daily').exists()).toBe(true)
      expect(wrapper.find('.journey-navigation').exists()).toBe(false)
      expect(wrapper.text()).not.toMatch(/PRIVATE_FLIGHTS|PRIVATE_PACKING|PRIVATE_ACCOUNT/)
    }
    await wrapper.get('#leg-tab-iceland').trigger('click')
    await wrapper.get('#day-tab-2026-10-31').trigger('click')
    expect(wrapper.text()).toContain('拍攝建議')
    expect(wrapper.text()).toContain('iPhone')
    expect(wrapper.text()).toContain('相機')
    expect(wrapper.text()).not.toMatch(/收藏|留言|jinyo|Rosanne/)
    wrapper.unmount()
  })

  it('provides four member tabs and renders only the selected section', async () => {
    const wrapper = mount(TripReader, { props: { publicOnly: false, companionMode: true, journey: icelandJourney }, slots: { flights: '<p>我的班次</p>', preparation: '<p>個人行李</p>', me: '<p>我的身分</p>' } })
    expect(wrapper.findAll('.journey-navigation button').map(b=>b.text())).toEqual(['行程','我的航班','行前準備','我的'])
    for (const [tab, text] of [['flights','我的班次'],['more','個人行李'],['me','我的身分']]) {
      await wrapper.get('#view-tab-'+tab).trigger('click')
      expect(wrapper.text()).toContain(text)
      expect(wrapper.find('#view-daily').exists()).toBe(false)
    }
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

  it('keeps London free of the Iceland aurora card before the trip', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-20T12:00:00Z'))
    const wrapper = mount(TripReader, { props: { publicOnly: true } })
    expect(wrapper.find('.global-information [aria-labelledby="aurora-heading"]').exists()).toBe(false)
    wrapper.unmount()
    vi.useRealTimers()
  })
})
