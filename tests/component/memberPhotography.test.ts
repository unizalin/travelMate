import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import MemberPhotography from '@/components/trip/MemberPhotography.vue'
import { memberPhotoDeviceKey, type PhotoDevice } from '@/domain/memberPhotography'
import { photographyWeatherKey } from '@/components/trip/photographyContext'
import type { PhotographyWeather } from '@/domain/photographyAdvice'
const item = { id: 'waterfall', date: '2026-10-31', name: 'Skógafoss', order: 1, status: 'planned' as const }
describe('member photography', () => {
  it('offers settings even without existing photo spots and shares device choice across stops', async () => {
    const device = ref<PhotoDevice>('a7c')
    const options = { props: { item }, global: { provide: { [memberPhotoDeviceKey]: device } } }
    const first = mount(MemberPhotography, options)
    const second = mount(MemberPhotography, { ...options, props: { item: { ...item, id: 'other', name: 'Hallgrímskirkja' } } })
    expect(first.text()).toContain('轉盤 1')
    await first.get('select').setValue('action5')
    expect(second.text()).toContain('Action 5 · 旅途錄影')
    expect(first.text()).toContain('瀑布全景')
    expect(first.text()).not.toContain('濾鏡怎麼選')
    first.unmount(); second.unmount()
  })
  it('withdraws slow exposure guidance in wind and falls back when weather expires', async () => {
    const weather = ref<PhotographyWeather | null>({ fetchedAt: new Date().toISOString(), regionLabel: '南岸', sunrise: null, sunset: null, day: { date: item.date, temperatureMin: 0, temperatureMax: 5, apparentMin: 0, apparentMax: 5, wind: 12, gusts: 17, precipitation: 1, precipitationProbability: 80, snowfall: 0, sunrise: null, sunset: null } })
    const wrapper = mount(MemberPhotography, { props: { item }, global: { provide: { [photographyWeatherKey]: weather } } })
    expect(wrapper.text()).toContain('先不套用 ND64 慢門')
    expect(wrapper.text()).toContain('遮擋鏡頭')
    weather.value = { ...weather.value!, fetchedAt: '2020-01-01T00:00:00Z' }
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('尚無有效區域預報')
    expect(wrapper.text()).not.toContain('南岸 日預報')
    wrapper.unmount()
  })
})
