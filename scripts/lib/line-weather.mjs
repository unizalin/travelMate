import { CITIES } from './aurora-push.mjs'

const dayCities = {
  '2026-10-30': 'reykjavik', '2026-10-31': 'snaefellsnes', '2026-11-01': 'golden',
  '2026-11-02': 'vik', '2026-11-03': 'hofn', '2026-11-04': 'jokulsarlon',
  '2026-11-05': 'jokulsarlon', '2026-11-06': 'reykjavik', '2026-11-07': 'keflavik',
}
const number = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null
const instant = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(value) ? Date.parse(`${value}Z`) : NaN

export function parseLineWeather(payload, now) {
  const date = now.toISOString().slice(0, 10)
  const index = payload?.daily?.time?.indexOf(date)
  if (!Number.isInteger(index) || index < 0) return null
  const units = payload.daily_units
  if (units?.temperature_2m_min !== '°C' || units?.temperature_2m_max !== '°C' || units?.wind_speed_10m_max !== 'm/s' || units?.precipitation_probability_max !== '%' || payload.utc_offset_seconds !== 0) return null
  const min = number(payload.daily.temperature_2m_min?.[index], -90, 60)
  const max = number(payload.daily.temperature_2m_max?.[index], -90, 60)
  if (min === null || max === null || min > max) return null
  const clouds = []
  if (payload.hourly_units?.cloud_cover === '%' && Array.isArray(payload.hourly?.time)) {
    payload.hourly.time.forEach((time, i) => {
      const at = instant(time), cloud = number(payload.hourly.cloud_cover?.[i], 0, 100)
      if (at > now.getTime() && at <= now.getTime() + 3 * 3600000 && cloud !== null) clouds.push(cloud)
    })
  }
  return {
    min, max, wind: number(payload.daily.wind_speed_10m_max?.[index], 0, 150),
    rain: number(payload.daily.precipitation_probability_max?.[index], 0, 100),
    cloudMin: clouds.length ? Math.min(...clouds) : null, cloudMax: clouds.length ? Math.max(...clouds) : null,
  }
}

export async function loadLineWeather(now = new Date(), fetcher = fetch) {
  const date = now.toISOString().slice(0, 10)
  const city = CITIES[dayCities[date] ?? 'reykjavik']
  const params = new URLSearchParams({ latitude: String(city.lat), longitude: String(city.lon),
    daily: 'temperature_2m_min,temperature_2m_max,wind_speed_10m_max,precipitation_probability_max',
    hourly: 'cloud_cover', forecast_days: '2', timezone: 'Atlantic/Reykjavik', wind_speed_unit: 'ms', temperature_unit: 'celsius' })
  try {
    const response = await fetcher(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(4000) })
    if (!response.ok) throw new Error('weather_unavailable')
    return { city: city.label, date, fetchedAt: now.toISOString(), forecast: parseLineWeather(await response.json(), now) }
  } catch {
    return { city: city.label, date, fetchedAt: now.toISOString(), forecast: null }
  }
}
