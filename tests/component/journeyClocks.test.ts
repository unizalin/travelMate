import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import JourneyClocks from '@/components/trip/JourneyClocks.vue'

afterEach(() => vi.useRealTimers())
describe('combined journey clocks', () => {
  it.each([
    ['2026-10-24T12:00:00Z', '13:00'],
    ['2026-10-25T12:00:00Z', '12:00'],
  ])('keeps the three clocks correct across UK daylight saving: %s', (now, london) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(now))
    const wrapper = mount(JourneyClocks, { props: { combined: true } })
    expect(wrapper.text()).toBe(`倫敦 ${london} · 冰島 12:00 · 台灣 20:00`)
    wrapper.unmount()
  })
})
