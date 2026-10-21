import type { WeatherDay, WeatherRegion } from '@/domain/tripWeather'

export type DayForecastResult = { kind: 'forecast'; day: WeatherDay; fetchedAt: string } | { kind: 'unavailable'; fetchedAt: string }
type LoadOptions = { date: string; region: WeatherRegion; signal?: AbortSignal; fetchImpl?: (url: string, init?: RequestInit) => Promise<Response> }
const units: Record<string, string> = { temperature_2m_min: '°C', temperature_2m_max: '°C', apparent_temperature_min: '°C', apparent_temperature_max: '°C', precipitation_sum: 'mm', snowfall_sum: 'cm', wind_speed_10m_max: 'm/s', wind_gusts_10m_max: 'm/s', precipitation_probability_max: '%' }
const variables = [...Object.keys(units), 'sunrise', 'sunset']
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) }

export function parseDayForecast(payload: unknown, date: string): WeatherDay | null {
  if (!record(payload) || !record(payload.daily) || !record(payload.daily_units)) throw new Error('預報資料格式不完整。')
  const daily = payload.daily
  const times = daily.time
  if (!Array.isArray(times) || !times.every(time => typeof time === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(time))) throw new Error('預報日期格式無效。')
  for (const [key, unit] of Object.entries(units)) if (payload.daily_units[key] !== unit) throw new Error('預報單位不符，暫不顯示數值。')
  for (const key of variables) if (daily[key] != null && (!Array.isArray(daily[key]) || daily[key].length !== times.length)) throw new Error('預報時段資料不一致。')
  const index = times.indexOf(date)
  if (index === -1) return null
  function numberAt(key: string, min: number, max: number): number | null {
    const values = daily[key]
    const value: unknown = Array.isArray(values) ? values[index] : null
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null
  }
  function sunTime(key: string): string | null {
    const values = daily[key]
    const value: unknown = Array.isArray(values) ? values[index] : null
    return typeof value === 'string' && value.startsWith(`${date}T`) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}Z`)) ? value : null
  }
  const temperatureMin = numberAt('temperature_2m_min', -90, 60)
  const temperatureMax = numberAt('temperature_2m_max', -90, 60)
  const apparentMin = numberAt('apparent_temperature_min', -110, 70)
  const apparentMax = numberAt('apparent_temperature_max', -110, 70)
  if (temperatureMin != null && temperatureMax != null && temperatureMin > temperatureMax) throw new Error('預報溫度範圍無效。')
  if (apparentMin != null && apparentMax != null && apparentMin > apparentMax) throw new Error('預報體感範圍無效。')
  return { date, temperatureMin, temperatureMax, apparentMin, apparentMax, precipitation: numberAt('precipitation_sum', 0, 2000), precipitationProbability: numberAt('precipitation_probability_max', 0, 100), snowfall: numberAt('snowfall_sum', 0, 1000), wind: numberAt('wind_speed_10m_max', 0, 150), gusts: numberAt('wind_gusts_10m_max', 0, 150), sunrise: sunTime('sunrise'), sunset: sunTime('sunset') }
}

export async function loadDayForecast(options: LoadOptions): Promise<DayForecastResult> {
  const controller = new AbortController()
  const forward = () => controller.abort()
  if (options.signal?.aborted) controller.abort()
  options.signal?.addEventListener('abort', forward, { once: true })
  const timeout = setTimeout(forward, 8000)
  const params = new URLSearchParams({ latitude: String(options.region.latitude), longitude: String(options.region.longitude), daily: variables.join(','), forecast_days: '16', timezone: 'Atlantic/Reykjavik', wind_speed_unit: 'ms', temperature_unit: 'celsius', precipitation_unit: 'mm' })
  try {
    const response = await (options.fetchImpl ?? fetch)(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal })
    if (!response.ok) throw new Error(`天氣來源暫時無法讀取（${response.status}）。`)
    const payload: unknown = await response.json()
    if (controller.signal.aborted) throw new DOMException('aborted', 'AbortError')
    const day = parseDayForecast(payload, options.date)
    const fetchedAt = new Date().toISOString()
    return day ? { kind: 'forecast', day, fetchedAt } : { kind: 'unavailable', fetchedAt }
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) throw new Error('天氣資料讀取逾時，請重試。')
    throw error
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', forward)
  }
}
