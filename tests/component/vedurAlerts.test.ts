import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TripReader from '@/components/trip/TripReader.vue'

const vedur = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('@/services/vedurAlertService', () => ({ loadVedurAlerts: vedur.load }))
vi.mock('@/services/tripWeatherService', () => ({ loadDayForecast: async () => ({ kind: 'unavailable', fetchedAt: new Date().toISOString() }) }))

afterEach(() => {
  vi.useRealTimers()
  vedur.load.mockReset()
})

describe('Veður warning banner', () => {
  it('appears only in the Iceland daily section, refreshes every ten minutes, and clears on failure', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-02T12:00:00Z'))
    const warning = {
      level: 'yellow',
      area: 'South Iceland',
      headline: 'Strong winds on the south coast',
      startsAt: '2026-11-02T10:00:00.000Z',
      endsAt: '2026-11-02T14:00:00.000Z',
    }
    vedur.load
      .mockResolvedValueOnce({ kind: 'available', alerts: Array.from({ length: 4 }, (_, index) => ({ ...warning, headline: `${warning.headline} ${index + 1}` })), fetchedAt: new Date().toISOString() })
      .mockResolvedValue({ kind: 'unavailable', alerts: [], fetchedAt: new Date().toISOString() })
    const wrapper = mount(TripReader, { props: { publicOnly: true } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()
    expect(vedur.load).toHaveBeenCalledTimes(1)
    const banner = wrapper.get('[aria-label="Veður 官方天氣警報"]')
    expect(banner.text()).toContain('Strong winds on the south coast')
    expect(banner.findAll('.vedur-alert')).toHaveLength(3)
    expect(banner.get('a').attributes('href')).toBe('https://en.vedur.is/vidvaranir')

    await wrapper.get('#leg-tab-london').trigger('click')
    expect(wrapper.find('[aria-label="Veður 官方天氣警報"]').exists()).toBe(false)
    await wrapper.get('#leg-tab-iceland').trigger('click')
    expect(wrapper.find('[aria-label="Veður 官方天氣警報"]').exists()).toBe(true)
    expect(vedur.load).toHaveBeenCalledTimes(1)
    await wrapper.get('#view-tab-flights').trigger('click')
    expect(wrapper.find('[aria-label="Veður 官方天氣警報"]').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    await wrapper.vm.$nextTick()
    expect(vedur.load).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[aria-label="Veður 官方天氣警報"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
