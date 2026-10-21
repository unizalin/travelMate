import { describe, expect, it } from 'vitest'
import { loadDayForecast, parseDayForecast } from '@/services/tripWeatherService'
import { weatherRegionsForDate } from '@/domain/tripWeather'

const payload = {
  daily_units: { temperature_2m_min: '°C', temperature_2m_max: '°C', apparent_temperature_min: '°C', apparent_temperature_max: '°C', precipitation_sum: 'mm', snowfall_sum: 'cm', wind_speed_10m_max: 'm/s', wind_gusts_10m_max: 'm/s', precipitation_probability_max: '%' },
  daily: { time: ['2026-10-30'], temperature_2m_min: [1], temperature_2m_max: [6], apparent_temperature_min: [-3], apparent_temperature_max: [3], precipitation_sum: [4], precipitation_probability_max: [60], snowfall_sum: [0], wind_speed_10m_max: [9], wind_gusts_10m_max: [17], sunrise: ['2026-10-30T09:10'], sunset: ['2026-10-30T17:10'] },
}

describe('Date-specific weather source', () => {
  it('only reads measurements belonging to the requested date', () => {
    expect(parseDayForecast(payload, '2026-10-30')).toMatchObject({ temperatureMin: 1, gusts: 17, sunrise: '2026-10-30T09:10' })
    expect(parseDayForecast(payload, '2026-11-07')).toBeNull()
  })
  it('preserves missing data and zero snowfall instead of inventing measurements', () => {
    const result = parseDayForecast({ ...payload, daily: { ...payload.daily, apparent_temperature_min: [null] } }, '2026-10-30')
    expect(result?.apparentMin).toBeNull()
    expect(result?.snowfall).toBe(0)
  })
  it('rejects unit mismatches and malformed source arrays', () => {
    expect(() => parseDayForecast({ ...payload, daily_units: { ...payload.daily_units, wind_speed_10m_max: 'km/h' } }, '2026-10-30')).toThrow()
    expect(() => parseDayForecast({ ...payload, daily: { ...payload.daily, wind_gusts_10m_max: [1, 2] } }, '2026-10-30')).toThrow()
  })
  it('requests public region coordinates with explicit Icelandic time and m/s units', async () => {
    let requested = ''
    const result = await loadDayForecast({ date: '2026-10-30', region: weatherRegionsForDate('2026-10-30')[0], fetchImpl: async url => {
      requested = url
      return new Response(JSON.stringify(payload), { status: 200 })
    } })
    expect(result.kind).toBe('forecast')
    expect(requested).toContain('wind_speed_unit=ms')
    expect(requested).toContain('forecast_days=16')
    expect(requested).not.toContain('tripId')
    expect(requested).toContain('Atlantic%2FReykjavik')
  })
})
