import { describe, expect, it } from 'vitest'
import { photographyAdvice, type PhotographyWeather, type PhotoLens } from '@/domain/photographyAdvice'
const now = Date.parse('2026-10-31T12:00:00Z')
const weather: PhotographyWeather = {
  regionLabel: '教堂山一帶', fetchedAt: '2026-10-31T11:50:00Z', sunrise: '09:15', sunset: '17:00',
  day: { date: '2026-10-31', temperatureMin: 0, temperatureMax: 5, apparentMin: -3, apparentMax: 2, wind: 4, gusts: 8, precipitation: 0, precipitationProbability: 0, snowfall: 0, sunrise: null, sunset: null },
}
const base = { date: '2026-10-31', scene: 'landscape' as const, lens: 'f4' as const, now }
describe('weather-aware photography advice', () => {
  it('labels the regional daily forecast and never presents it as a light meter', () => {
    const advice = photographyAdvice({ ...base, weather })
    expect(advice.forecastLabel).toContain('教堂山一帶')
    expect(advice.forecastLabel).toContain('日預報')
    expect(advice.conditions.join(' ')).toContain('09:15')
    expect(advice.camera.aperture).toBe(8)
    expect(advice.phone.join(' ')).not.toMatch(/ISO|f\/|ProRAW|48MP/)
  })
  it.each([null, { ...weather, fetchedAt: '2026-10-31T11:29:00Z' }, { ...weather, fetchedAt: '2026-10-31T12:10:00Z' }, { ...weather, day: { ...weather.day, date: '2026-11-01' } }])('uses scene-only guidance for absent, stale, future or wrong-date forecasts', forecast => {
    const advice = photographyAdvice({ ...base, weather: forecast })
    expect(advice.forecastLabel).toBeNull()
    expect(advice.conditions.join(' ')).toContain('尚無當日有效區域預報')
    expect(advice.conditions.join(' ')).not.toContain('09:15')
  })
  it('withdraws slow-shutter suggestions when the daily wind reminder threshold is reached', () => {
    const advice = photographyAdvice({ ...base, scene: 'water', weather: { ...weather, day: { ...weather.day, gusts: 17 } } })
    expect(advice.camera.mode).toContain('S')
    expect(advice.camera.shutter).toContain('1/500')
    expect(advice.slowShutterAllowed).toBe(false)
    expect(advice.phone.join(' ')).toContain('避免長曝')
    expect(advice.phone.join(' ')).not.toContain('「長時間曝光」效果')
  })
  it.each<[PhotoLens, number]>([['f28', 2.8], ['f4', 4], ['travel-wide', 3.5], ['travel-tele', 6.7]])('does not recommend a wider aperture than the chosen lens %s supports', (lens, aperture) => {
    const advice = photographyAdvice({ ...base, scene: 'low-light', lens, weather: null })
    expect(advice.camera.aperture).toBe(aperture)
  })
  it('does not treat missing rain or wind as zero or infer clear skies', () => {
    const advice = photographyAdvice({ ...base, weather: { ...weather, day: { ...weather.day, wind: null, gusts: null, precipitation: null, precipitationProbability: null, snowfall: null } } })
    expect(advice.conditions.join(' ')).toContain('部分風雨雪資料缺漏')
    expect(advice.conditions.join(' ')).not.toMatch(/天氣晴朗|風速 0|降水 0/)
  })
  it('uses rain and snow as forecast reminders rather than measured light', () => {
    const advice = photographyAdvice({ ...base, weather: { ...weather, day: { ...weather.day, precipitationProbability: 80, snowfall: 2 } } })
    expect(advice.conditions.join(' ')).toContain('降水')
    expect(advice.conditions.join(' ')).toContain('雪')
    expect(advice.camera.aperture).toBe(8)
  })
})
