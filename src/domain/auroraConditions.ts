export type AuroraCityId = 'reykjavik' | 'vik' | 'jokulsarlon' | 'snaefellsnes' | 'golden' | 'hofn' | 'keflavik'

export type AuroraCity = {
  id: AuroraCityId
  label: string
  latitude: number
  longitude: number
  timeZone: string
}

export type AuroraHour = {
  time: string
  cloudCover: number | null
  kp: number | null
}

export type AuroraAssessment = {
  label: '雲量條件較佳' | '部分時段晴朗' | '雲量中等' | '雲量偏多' | '資料不足'
  reason: string
}

export const AURORA_CITIES: readonly AuroraCity[] = [
  { id: 'reykjavik', label: 'Reykjavík', latitude: 64.1466, longitude: -21.9426, timeZone: 'Atlantic/Reykjavik' },
  { id: 'vik', label: 'Vík', latitude: 63.4186, longitude: -19.006, timeZone: 'Atlantic/Reykjavik' },
  { id: 'jokulsarlon', label: 'Jökulsárlón', latitude: 64.0485, longitude: -16.1794, timeZone: 'Atlantic/Reykjavik' },
  { id: 'snaefellsnes', label: 'Snæfellsnes／教堂山', latitude: 64.924, longitude: -23.263, timeZone: 'Atlantic/Reykjavik' },
  { id: 'golden', label: '黃金圈', latitude: 64.327, longitude: -20.119, timeZone: 'Atlantic/Reykjavik' },
  { id: 'hofn', label: 'Höfn', latitude: 64.2539, longitude: -15.2082, timeZone: 'Atlantic/Reykjavik' },
  { id: 'keflavik', label: 'Reykjanes／Keflavík', latitude: 64.0049, longitude: -22.5624, timeZone: 'Atlantic/Reykjavik' },
]

function parseUtcTime(value: string): number {
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`)
}

export function selectNightHours(input: {
  now: Date
  sunset: string
  sunrise: string
  hourlyTimes: string[]
}): string[] {
  const sunset = parseUtcTime(input.sunset)
  const sunrise = parseUtcTime(input.sunrise)
  const now = input.now.getTime()
  if (!Number.isFinite(sunset) || !Number.isFinite(sunrise) || sunrise <= sunset) return []

  return input.hourlyTimes.filter(time => {
    const instant = parseUtcTime(time)
    return Number.isFinite(instant) && instant > now && instant >= sunset && instant < sunrise
  })
}

function validKp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 9 ? value : null
}

function isForecastRow(row: Record<string, unknown>): boolean {
  const kind = typeof row.observed === 'string' ? row.observed.toLowerCase() : ''
  return kind === 'forecast' || kind === 'predicted' || kind === 'estimated'
}

export function matchNoaaForecast(
  hourlyTimes: string[],
  rows: Array<Record<string, unknown>>,
  now: Date,
): Array<{ time: string; kp: number | null }> {
  const nowMs = now.getTime()
  const forecasts = rows
    .filter(isForecastRow)
    .map(row => ({
      start: typeof row.time_tag === 'string' ? parseUtcTime(row.time_tag) : Number.NaN,
      kp: validKp(row.kp),
    }))
    .filter(row => Number.isFinite(row.start) && row.start + 3 * 60 * 60 * 1000 > nowMs)

  return hourlyTimes.map(time => {
    const instant = parseUtcTime(time)
    const slot = forecasts.find(row => instant >= row.start && instant < row.start + 3 * 60 * 60 * 1000)
    return { time, kp: slot?.kp ?? null }
  })
}

export function deriveAuroraAssessment(hours: AuroraHour[]): AuroraAssessment {
  if (hours.length === 0) return { label: '資料不足', reason: '目前沒有同時段的夜間預報資料。' }
  const validHours = hours.flatMap(({ cloudCover, kp }) => {
    if (cloudCover == null || kp == null || !Number.isFinite(cloudCover) || !Number.isFinite(kp)
      || cloudCover < 0 || cloudCover > 100 || kp < 0 || kp > 9) return []
    return [{ cloudCover, kp }]
  })
  if (validHours.length === 0) {
    return { label: '資料不足', reason: '部分時段缺少雲量或 Kp 資料。' }
  }

  let assessment: AuroraAssessment
  if (validHours.every(hour => hour.cloudCover <= 30)) {
    assessment = { label: '雲量條件較佳', reason: '目前配對到的夜間時段雲量較少；Kp 僅供活動強弱參考。' }
  } else if (validHours.some(hour => hour.cloudCover <= 30)) {
    assessment = { label: '部分時段晴朗', reason: '今晚部分時段雲量較少，其餘時段雲量較多；請以最佳觀測時段為準。' }
  } else if (validHours.every(hour => hour.cloudCover >= 70)) {
    assessment = { label: '雲量偏多', reason: '目前配對到的夜間時段雲量偏多；Kp 僅供活動強弱參考。' }
  } else {
    assessment = { label: '雲量中等', reason: '今晚各時段雲量中等，沒有特別晴朗的時段。' }
  }

  return {
    ...assessment,
    reason: assessment.reason + (validHours.length < hours.length ? '（部分時段缺資料，依其餘時段判定）' : ''),
  }
}
