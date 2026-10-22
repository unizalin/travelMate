import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import PhotographySpots from '@/components/trip/PhotographySpots.vue'
import { photographyWeatherKey } from '@/components/trip/photographyContext'
import type { PhotographyWeather } from '@/domain/photographyAdvice'
import type { JourneyItem } from '@/domain/tripJourney'
const item: JourneyItem = { id: 'waterfall', date: '2026-10-31', name: 'Skógafoss', order: 1, status: 'planned', photoTip: '瀑布構圖', photoSpots: [{ id: 'photo-skogafoss-scale', title: '尺度', device: 'both', composition: '瀑布與人物比例' }] }
const forecast = (): PhotographyWeather => ({ regionLabel: '測試區域', fetchedAt: new Date().toISOString(), sunrise: '09:15', sunset: '17:00', day: { date: item.date, temperatureMin: 0, temperatureMax: 5, apparentMin: -3, apparentMax: 2, wind: 12, gusts: 17, precipitation: 2, precipitationProbability: 80, snowfall: 0, sunrise: null, sunset: null } })
describe('Photography controls', () => {
  it('updates settings for the chosen lens and uses only native common phone controls', async () => {
    const wrapper = mount(PhotographySpots, { props: { item } })
    await wrapper.get('select[id$="-scene"]').setValue('low-light')
    await wrapper.get('select[id$="-lens"]').setValue('travel-tele')
    expect(wrapper.get('.dynamic-camera').text()).toContain('f/6.7')
    expect(wrapper.get('.dynamic-camera').text()).not.toContain('f/2.8')
    await wrapper.get('select[id$="-lens"]').setValue('f28')
    expect(wrapper.get('.dynamic-camera').text()).toContain('f/2.8')
    expect(wrapper.findAll('.dynamic-phone').map(p => p.text()).join(' ')).not.toMatch(/ISO|f\/|ProRAW/)
    wrapper.unmount()
  })
  it('uses shared daily weather and removes manual slow-shutter references in wind', async () => {
    const weather = ref<PhotographyWeather | null>(forecast())
    const wrapper = mount(PhotographySpots, { props: { item }, global: { provide: { [photographyWeatherKey]: weather } } })
    await wrapper.get('select[id$="-scene"]').setValue('water')
    expect(wrapper.text()).toContain('測試區域 日預報')
    expect(wrapper.get('.dynamic-camera').text()).toContain('1/500')
    expect(wrapper.find('.camera-settings').exists()).toBe(false)
    weather.value = null; await flushPromises()
    expect(wrapper.text()).toContain('尚無當日有效區域預報')
    expect(wrapper.text()).not.toContain('測試區域 日預報')
    wrapper.unmount()
  })
  it('does not reuse weather for a different activity date', () => {
    const weather = ref(forecast())
    const wrapper = mount(PhotographySpots, { props: { item: { ...item, date: '2026-11-02' } }, global: { provide: { [photographyWeatherKey]: weather } } })
    expect(wrapper.text()).toContain('尚無當日有效區域預報')
    expect(wrapper.text()).not.toContain('測試區域 日預報')
    wrapper.unmount()
  })
})
