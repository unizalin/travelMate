import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TripReader from '@/components/trip/TripReader.vue'
import LondonItinerary from '@/components/trip/LondonItinerary.vue'
import { publicLondonJourney } from '@/data/londonPublic'
import { londonItinerary } from '@/data/londonItinerary'
import { icelandJourney } from '@/data/icelandJourney'

vi.mock('@/services/tripWeatherService', () => ({ loadDayForecast: async () => ({ kind: 'unavailable', fetchedAt: new Date().toISOString() }) }))

describe('public London and Iceland page', () => {
  it('shows the two journey legs with their own dates and no private controls', async () => {
    const wrapper = mount(TripReader)
    expect(wrapper.get('h1').text()).toContain('一起去倫敦・冰島')
    expect(wrapper.get('h1').text()).toContain('15 天')
    expect(wrapper.get('.clocks').text()).toMatch(/倫敦.*台灣/)
    expect(wrapper.findAll('[aria-label="旅程檢視"] button').map(button=>button.text())).toEqual(['每日行程','我的航班','行前準備'])
    expect(wrapper.findAll('[aria-label="行程日期"]')).toHaveLength(1)
    const dateTabs = wrapper.findAll('[aria-label="行程日期"] [role="tab"]')
    expect(dateTabs).toHaveLength(6)
    expect(dateTabs[0].attributes('id')).toBe('day-tab-2026-10-24')
    await dateTabs[0].trigger('click')
    const london = wrapper.get('[aria-label="倫敦前段行程"]')
    for (let index=0;index<6;index++) {
      await dateTabs[index].trigger('click')
      expect(london.get('.daily-heading').text()).toBe(londonItinerary.days[index].title)
      expect(london.findAll('.activity-heading h3').map(heading=>heading.text()).slice(0,londonItinerary.days[index].stops.length)).toEqual(londonItinerary.days[index].stops.map(stop=>stop.name))
      expect(wrapper.findAll('#view-daily [role="tabpanel"]')).toHaveLength(1)
      expect(wrapper.find('[aria-label="天氣與出門準備"]').exists()).toBe(false)
    }
    expect(london.text()).toContain('Flat Iron Soho')
    expect(london.find('.activity-map').attributes('href')).toContain('google.com/maps/search')
    expect(wrapper.text()).not.toMatch(/jinyo|Kevin Ho|Rosanne|YU|參加：|留言|編輯行程|加入共同行程/)
    expect(wrapper.find('.activity-editor,.drag-handle,.comments,.prelude-people').exists()).toBe(false)
    await wrapper.get('#leg-tab-iceland').trigger('click')
    expect(wrapper.findAll('[aria-label="行程日期"] [role="tab"]')).toHaveLength(9)
    expect(wrapper.get('#day-tab-2026-11-07').exists()).toBe(true)
    expect(wrapper.get('.clocks').text()).toMatch(/冰島.*台灣/)
    await wrapper.get('#view-tab-more').trigger('click')
    expect(wrapper.get('#view-preparation').text()).toContain('行程 09:00–15:00')
    expect(wrapper.get('#view-preparation').text()).toContain('行程 11:20–13:20')
    expect(wrapper.get('#view-preparation').text()).toContain('11/7 Blue Lagoon')
    expect(wrapper.find('#view-flights').exists()).toBe(false)
    wrapper.unmount()
  })

  it('switches legs and dates without duplicate daily content', async () => {
    const wrapper = mount(TripReader)
    await wrapper.get('#day-tab-2026-10-29').trigger('click')
    await wrapper.get('#leg-tab-iceland').trigger('click')
    expect(wrapper.get('#day-tab-2026-10-30').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[aria-label="倫敦前段行程"]').exists()).toBe(false)
    expect(wrapper.get('[aria-label="天氣與出門準備"]').exists()).toBe(true)
    expect(wrapper.get('.daily-heading').text()).toContain('Day 01')
    await wrapper.get('#leg-tab-london').trigger('click')
    await wrapper.get('#day-tab-2026-10-29').trigger('click')
    expect(wrapper.get('#day-tab-2026-10-29').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[aria-label="倫敦前段行程"]').text()).toContain('Lyceum Theatre')
    expect(wrapper.find('[aria-label="天氣與出門準備"]').exists()).toBe(false)
    const heading = wrapper.get('.london-prelude .activity-heading')
    await heading.trigger('touchstart',{changedTouches:[{clientX:300,clientY:200}]})
    await heading.trigger('touchend',{changedTouches:[{clientX:500,clientY:200}]})
    expect(wrapper.get('#day-tab-2026-10-28').attributes('aria-selected')).toBe('true')
    expect(wrapper.findAll('#view-daily [role="tabpanel"]')).toHaveLength(1)
    wrapper.unmount()
  })

  it('opens the London local day before Iceland begins, including the summer-time date boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-24T23:30:00Z'))
    const wrapper = mount(TripReader)
    expect(wrapper.get('#day-tab-2026-10-25').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[aria-label="倫敦前段行程"]').text()).toContain('The Muffin Man Tea Shop')
    wrapper.unmount()
    vi.useRealTimers()
  })

  it('opens the Iceland local day and keeps the last trip day after the trip', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-03T12:00:00Z'))
    let wrapper = mount(TripReader)
    expect(wrapper.get('#leg-tab-iceland').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('#day-tab-2026-11-03').attributes('aria-selected')).toBe('true')
    wrapper.unmount()

    vi.setSystemTime(new Date('2026-11-08T12:00:00Z'))
    wrapper = mount(TripReader)
    expect(wrapper.get('#day-tab-2026-11-07').attributes('aria-selected')).toBe('true')
    wrapper.unmount()
    vi.useRealTimers()
  })

  it('keeps public London independent from private journey fields or supplied private slots', () => {
    const privateJourney = { ...icelandJourney, members:[{...icelandJourney.members[0],displayName:'PRIVATE_PERSON_SENTINEL'}], memos:{'london-2026-10-24-1':{content:'PRIVATE_COMMENT_SENTINEL',updatedBy:'account',updatedByName:'PRIVATE_PERSON_SENTINEL',updatedAt:'2026-10-21T00:00:00Z'}} }
    const wrapper = mount(TripReader, { props:{journey:privateJourney,publicOnly:true},slots:{prelude:()=>h('p','PRIVATE_PRELUDE_SENTINEL'), 'daily-footer':()=>h('button','編輯行程')} })
    expect(wrapper.text()).toContain('Hammersmith')
    expect(wrapper.text()).not.toMatch(/PRIVATE_|編輯行程|jinyo|Kevin Ho|Rosanne|YU/)
    wrapper.unmount()
  })

  it('renders an approved London accommodation without rooms or participant details', () => {
    const journey = { ...publicLondonJourney, accommodations:[{id:'public-london-fixture-stay',tripId:publicLondonJourney.tripId,name:'London fixture hotel',checkIn:'2026-10-24',checkOut:'2026-10-30',participantIds:[],rooms:[],benefits:['早餐依訂單確認']}] }
    const wrapper = mount(LondonItinerary,{props:{journey}})
    expect(wrapper.get('.compact-stay').text()).toContain('London fixture hotel')
    expect(wrapper.find('.prelude-people,input,textarea,.comments').exists()).toBe(false)
    wrapper.unmount()
  })
})
