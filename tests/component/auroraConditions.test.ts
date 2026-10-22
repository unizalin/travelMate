import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AURORA_CITIES } from '@/domain/auroraConditions'
import AuroraConditions from '@/components/trip/AuroraConditions.vue'

const auroraMock = vi.hoisted(() => ({ load: vi.fn(), dispose: vi.fn() }))
vi.mock('@/services/auroraService', () => ({
  AuroraConditionsService: class {
    load(...args: unknown[]) { return auroraMock.load(...args) }
    dispose() { auroraMock.dispose() }
  },
}))

describe('AuroraConditions summary', () => {
  beforeEach(() => {
    auroraMock.load.mockReset().mockResolvedValue({
      city: AURORA_CITIES[0],
      localDate: '2026-11-01',
      sunset: '2026-11-01T17:00:00Z',
      sunrise: '2026-11-02T09:00:00Z',
      hours: [{ time: '2026-11-01T22:00:00Z', cloudCover: 25, kp: 4 }],
      assessment: { label: '雲量條件較佳', reason: '雲量較少，有機會看到極光。' },
      outlook: [
        { localDate: '2026-11-02', kp: 3, cloudCover: 60, assessment: { label: '資料不足', reason: '' } },
        { localDate: '2026-11-03', kp: 5, cloudCover: 20, assessment: { label: '雲量條件較佳', reason: '' } },
      ],
      fetchedAt: '2026-11-01T12:00:00Z',
      errors: [],
      sources: { noaa: 'https://services.swpc.noaa.gov/', openMeteo: 'https://open-meteo.com/' },
    })
  })

  it('shows Kp, cloud cover, a plain-language reading, the best window and both upcoming nights', async () => {
    const wrapper = mount(AuroraConditions, { props: { compact: true } })
    await flushPromises()

    expect(wrapper.text()).toContain('Kp 4')
    expect(wrapper.text()).toContain('雲量 25%')
    expect(wrapper.text()).toContain('有機會看到極光')
    expect(wrapper.text()).toContain('最佳觀測時段')
    expect(wrapper.text()).toContain('22:00–23:00')
    expect(wrapper.find('.aurora-conditions__body').exists()).toBe(false)
    expect(wrapper.find('.aurora-conditions__outlook').text()).toContain('明晚 Kp 3・雲量 60%')
    expect(wrapper.find('.aurora-conditions__outlook').text()).toContain('後晚 Kp 5・雲量 20%')
    expect(wrapper.find('.aurora-conditions__outlook').element.tagName).toBe('P')
    wrapper.unmount()
  })

  it('keeps location and notification controls out of the summary until details are opened', async () => {
    const wrapper = mount(AuroraConditions, { props: { compact: true }, slots: { reminders: '<div data-testid="reminders">提醒設定</div>' } })
    await flushPromises()
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.find('[data-testid="reminders"]').exists()).toBe(false)
    expect(wrapper.find('.aurora-conditions__reading').text()).toContain('Kp 4')
    await wrapper.get('.aurora-conditions__toggle').trigger('click')
    expect(wrapper.get('select').exists()).toBe(true)
    expect(wrapper.get('[data-testid="reminders"]').text()).toBe('提醒設定')
    expect(auroraMock.load).toHaveBeenCalledTimes(1)
    await wrapper.get('.aurora-conditions__toggle').trigger('click')
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.find('.aurora-conditions__outlook').text()).toContain('後晚 Kp 5')
    wrapper.unmount()
  })

  it.each([
    { label: '雲量條件較佳', tone: 'positive' },
    { label: '部分時段晴朗', tone: 'positive' },
    { label: '雲量中等', tone: 'neutral' },
    { label: '雲量偏多', tone: 'neutral' },
    { label: '資料不足', tone: 'neutral' },
  ])('shows $label with a defined $tone style', async ({ label, tone }) => {
    auroraMock.load.mockResolvedValue({
      city: AURORA_CITIES[0], localDate: '2026-10-22',
      sunset: '2026-10-22T17:00:00Z', sunrise: '2026-10-23T09:00:00Z',
      hours: [{ time: '2026-10-22T22:00:00Z', cloudCover: 25, kp: 4 }],
      assessment: { label, reason: '依有效時段判定。' },
      outlook: [], fetchedAt: new Date().toISOString(), errors: [],
      sources: { noaa: 'https://services.swpc.noaa.gov/', openMeteo: 'https://open-meteo.com/' },
    })
    const wrapper = mount(AuroraConditions)
    await flushPromises()

    const assessment = wrapper.get('.aurora-assessment')
    expect(assessment.text()).toBe(label)
    expect(assessment.classes()).toContain(`aurora-assessment--${tone}`)
    wrapper.unmount()
  })
})
