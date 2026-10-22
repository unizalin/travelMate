import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import TripReader from '@/components/trip/TripReader.vue'
import ItineraryActivities from '@/components/trip/ItineraryActivities.vue'
import { publicIcelandJourney } from '@/data/icelandPublic'
vi.mock('@/services/tripWeatherService', () => ({ loadDayForecast: async ({ date }: { date: string }) => ({ kind: 'forecast', fetchedAt: new Date().toISOString(), day: { date, temperatureMin: 0, temperatureMax: 5, apparentMin: -3, apparentMax: 2, wind: 12, gusts: 17, precipitation: 2, precipitationProbability: 80, snowfall: 0, sunrise: null, sunset: null } }) }))
vi.mock('@/services/vedurAlertService', () => ({ loadVedurAlerts: async () => ({ alerts: [] }) }))
vi.mock('@/components/trip/AuroraConditions.vue', () => ({ default: { template: '<div />' } }))
describe('shared photography forecast wiring', () => {
  it.each([true, false])('feeds the same daily weather into public=%s activity cards', async publicOnly => {
    const wrapper = mount(TripReader, {
      props: { publicOnly, journey: publicIcelandJourney },
      slots: publicOnly ? {} : { 'day-content': () => h(ItineraryActivities, { items: publicIcelandJourney.items.filter(item => item.date === '2026-10-31'), editing: false }) },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    if (publicOnly) await wrapper.get('#leg-tab-iceland').trigger('click')
    await wrapper.get('#day-tab-2026-10-31').trigger('click'); await flushPromises()
    const photo = wrapper.find('[data-testid="photography-spots"]')
    expect(photo.exists()).toBe(true)
    expect(photo.text()).toContain('Snæfellsnes／教堂山一帶 日預報')
    await photo.get('select[id$="-scene"]').setValue('water')
    expect(photo.get('.dynamic-camera').text()).toContain('1/500')
    await wrapper.get('#day-tab-2026-11-01').trigger('click'); await flushPromises()
    if (!publicOnly) expect(wrapper.find('[data-testid="photography-spots"]').text()).not.toContain('Snæfellsnes／教堂山一帶 日預報')
    wrapper.unmount()
  })
})
