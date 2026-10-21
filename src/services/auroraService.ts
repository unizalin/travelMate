import {
  AURORA_CITIES,
  deriveAuroraAssessment,
  matchNoaaForecast,
  selectNightHours,
  type AuroraCity,
  type AuroraCityId,
  type AuroraHour,
} from '@/domain/auroraConditions'

const NOAA_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json'
const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast'
const REQUEST_TIMEOUT_MS = 8_000

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>

export type AuroraConditions = {
  city: AuroraCity
  localDate: string
  sunset: string | null
  sunrise: string | null
  hours: AuroraHour[]
  assessment: ReturnType<typeof deriveAuroraAssessment>
  outlook: Array<{
    localDate: string
    kp: number | null
    cloudCover: number | null
    assessment: ReturnType<typeof deriveAuroraAssessment>
  }>
  fetchedAt: string
  errors: string[]
  sources: { noaa: string; openMeteo: string }
}

export type AuroraLoadOptions = {
  now?: Date
  fetchImpl?: FetchImpl
  signal?: AbortSignal
}

function cityFor(id: AuroraCityId): AuroraCity {
  const city = AURORA_CITIES.find(candidate => candidate.id === id)
  if (!city) throw new Error(`Unknown aurora city: ${id}`)
  return city
}

function localDateFor(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function isValidCloud(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

function parseOpenMeteo(payload: unknown): {
  times: string[]
  clouds: Array<number | null>
  sunsets: string[]
  sunrises: string[]
} {
  if (!payload || typeof payload !== 'object') throw new Error('Open-Meteo payload is invalid')
  const hourly = (payload as { hourly?: unknown }).hourly
  const daily = (payload as { daily?: unknown }).daily
  if (!hourly || typeof hourly !== 'object' || !daily || typeof daily !== 'object') throw new Error('Open-Meteo payload is incomplete')
  const times = (hourly as { time?: unknown }).time
  const clouds = (hourly as { cloud_cover?: unknown }).cloud_cover
  const sunsets = (daily as { sunset?: unknown }).sunset
  const sunrises = (daily as { sunrise?: unknown }).sunrise
  if (!Array.isArray(times) || !times.every(value => typeof value === 'string') || !Array.isArray(clouds) || times.length !== clouds.length) {
    throw new Error('Open-Meteo hourly payload is invalid')
  }
  if (!Array.isArray(sunsets) || !sunsets.every(value => typeof value === 'string') || !Array.isArray(sunrises) || !sunrises.every(value => typeof value === 'string')) {
    throw new Error('Open-Meteo daily payload is invalid')
  }
  return {
    times: times as string[],
    clouds: (clouds as unknown[]).map(value => value == null ? null : isValidCloud(value) ? value : null),
    sunsets: sunsets as string[],
    sunrises: sunrises as string[],
  }
}

function addLocalDays(localDate: string, days: number): string {
  const date = new Date(`${localDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function chooseNightSunsetSunrise(payload: ReturnType<typeof parseOpenMeteo>, localDate: string): { sunset: string; sunrise: string } | null {
  const sunset = payload.sunsets.find(value => value.slice(0, 10) === localDate)
  const sunrise = payload.sunrises.find(value => value.slice(0, 10) === addLocalDays(localDate, 1))
  if (!sunset || !sunrise) return null
  const parse = (value: string) => Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`)
  const sunsetMs = parse(sunset)
  const sunriseMs = parse(sunrise)
  return Number.isFinite(sunsetMs) && Number.isFinite(sunriseMs) && sunriseMs > sunsetMs ? { sunset, sunrise } : null
}

function parseNoaa(payload: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(payload)) throw new Error('NOAA payload is invalid')
  return payload.filter(row => row && typeof row === 'object') as Array<Record<string, unknown>>
}

async function requestJson(url: string, options: AuroraLoadOptions): Promise<unknown> {
  if (options.signal?.aborted) throw new DOMException('aborted', 'AbortError')
  const fetchImpl = options.fetchImpl ?? fetch
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  try {
    const response = await fetchImpl(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Request failed (${response.status})`)
    return await response.json()
  } catch (error) {
    if (options.signal?.aborted) throw new DOMException('aborted', 'AbortError')
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('資料請求逾時')
    throw error
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abort)
  }
}

export async function loadAuroraConditions(cityId: AuroraCityId, options: AuroraLoadOptions = {}): Promise<AuroraConditions> {
  const city = cityFor(cityId)
  const now = options.now ?? new Date()
  const localDate = localDateFor(now, city.timeZone)
  const openMeteoUrl = `${OPEN_METEO_BASE_URL}?latitude=${city.latitude}&longitude=${city.longitude}&hourly=cloud_cover,is_day&daily=sunrise,sunset&forecast_days=4&timezone=${encodeURIComponent(city.timeZone)}`
  const [openMeteoResponse, noaaResponse] = await Promise.allSettled([
    requestJson(openMeteoUrl, options),
    requestJson(NOAA_URL, options),
  ])
  if (options.signal?.aborted) throw new DOMException('aborted', 'AbortError')

  const errors: string[] = []
  let parsedOpen: ReturnType<typeof parseOpenMeteo> | null = null
  let rawOpen: unknown = null
  if (openMeteoResponse.status === 'fulfilled') {
    try {
      rawOpen = openMeteoResponse.value
      parsedOpen = parseOpenMeteo(rawOpen)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Open-Meteo 資料無效')
    }
  } else errors.push(openMeteoResponse.reason instanceof Error ? openMeteoResponse.reason.message : 'Open-Meteo 請求失敗')

  let noaaRows: Array<Record<string, unknown>> = []
  if (noaaResponse.status === 'fulfilled') {
    try {
      noaaRows = parseNoaa(noaaResponse.value)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'NOAA 資料無效')
    }
  } else errors.push(noaaResponse.reason instanceof Error ? noaaResponse.reason.message : 'NOAA 請求失敗')

  let sunset: string | null = null
  let sunrise: string | null = null
  let hours: AuroraHour[] = []
  const outlook: AuroraConditions['outlook'] = []
  if (parsedOpen && rawOpen) {
    const night = chooseNightSunsetSunrise(parsedOpen, localDate)
    if (night) {
      sunset = night.sunset
      sunrise = night.sunrise
      const nightTimes = selectNightHours({ now, sunset, sunrise, hourlyTimes: parsedOpen.times })
      const kpByHour = matchNoaaForecast(nightTimes, noaaRows, now)
      hours = kpByHour.map((hour, index) => ({
        ...hour,
        cloudCover: parsedOpen?.clouds[parsedOpen.times.indexOf(nightTimes[index])] ?? null,
      }))
    } else errors.push('Open-Meteo 缺少今天日落或明日日出資料')
    for (const offset of [1, 2]) {
      const outlookDate = addLocalDays(localDate, offset)
      const outlookNight = chooseNightSunsetSunrise(parsedOpen, outlookDate)
      let outlookHours: AuroraHour[] = []
      if (outlookNight) {
        const nightTimes = selectNightHours({ now, sunset: outlookNight.sunset, sunrise: outlookNight.sunrise, hourlyTimes: parsedOpen.times })
        const kpByHour = matchNoaaForecast(nightTimes, noaaRows, now)
        outlookHours = kpByHour.map((hour, index) => ({
          ...hour,
          cloudCover: parsedOpen?.clouds[parsedOpen.times.indexOf(nightTimes[index])] ?? null,
        }))
      }
      const kpValues = outlookHours.flatMap(hour => hour.kp == null ? [] : [hour.kp])
      const cloudValues = outlookHours.flatMap(hour => hour.cloudCover == null ? [] : [hour.cloudCover])
      outlook.push({
        localDate: outlookDate,
        kp: kpValues.length ? Math.max(...kpValues) : null,
        cloudCover: cloudValues.length ? Math.min(...cloudValues) : null,
        assessment: deriveAuroraAssessment(outlookHours),
      })
    }
  }

  return {
    city,
    localDate,
    sunset,
    sunrise,
    hours,
    assessment: deriveAuroraAssessment(hours),
    outlook,
    fetchedAt: new Date().toISOString(),
    errors,
    sources: { noaa: NOAA_URL, openMeteo: openMeteoUrl },
  }
}

export class AuroraConditionsService {
  private controller: AbortController | null = null
  private requestId = 0

  async load(cityId: AuroraCityId, options: AuroraLoadOptions = {}): Promise<AuroraConditions> {
    this.controller?.abort()
    const controller = new AbortController()
    const requestId = ++this.requestId
    this.controller = controller
    const forwardAbort = () => controller.abort()
    if (options.signal?.aborted) controller.abort()
    options.signal?.addEventListener('abort', forwardAbort, { once: true })
    try {
      const result = await loadAuroraConditions(cityId, { ...options, signal: controller.signal })
      if (requestId !== this.requestId) throw new DOMException('aborted', 'AbortError')
      return result
    } finally {
      options.signal?.removeEventListener('abort', forwardAbort)
      if (requestId === this.requestId) this.controller = null
    }
  }

  dispose(): void {
    this.requestId += 1
    this.controller?.abort()
    this.controller = null
  }
}
