import { describe, expect, it } from 'vitest'
import {
  AURORA_CITIES,
  deriveAuroraAssessment,
  matchNoaaForecast,
  selectNightHours,
  type AuroraHour,
} from '@/domain/auroraConditions'

describe('aurora condition time windows', () => {
  it('keeps tonight after sunset through next sunrise and drops expired hours', () => {
    const hours = selectNightHours({
      now: new Date('2026-10-14T19:30:00Z'),
      sunset: '2026-10-14T18:00:00Z',
      sunrise: '2026-10-15T08:00:00Z',
      hourlyTimes: [
        '2026-10-14T18:00:00Z',
        '2026-10-14T20:00:00Z',
        '2026-10-15T07:00:00Z',
        '2026-10-15T09:00:00Z',
      ],
    })

    expect(hours).toEqual(['2026-10-14T20:00:00Z', '2026-10-15T07:00:00Z'])
  })

  it('matches cloud hours only with the same NOAA three hour forecast slot', () => {
    const result = matchNoaaForecast(
      ['2026-10-14T21:00:00Z', '2026-10-15T00:00:00Z'],
      [
        { time_tag: '2026-10-14T21:00:00Z', kp: 4, observed: 'forecast' },
        { time_tag: '2026-10-14T18:00:00Z', kp: 9, observed: 'observed' },
      ],
      new Date('2026-10-14T20:00:00Z'),
    )

    expect(result).toEqual([
      { time: '2026-10-14T21:00:00Z', kp: 4 },
      { time: '2026-10-15T00:00:00Z', kp: null },
    ])
  })

  it('returns insufficient data when a matched hour has missing cloud or Kp', () => {
    const hours: AuroraHour[] = [
      { time: '2026-10-14T21:00:00Z', cloudCover: 20, kp: null },
      { time: '2026-10-15T00:00:00Z', cloudCover: null, kp: 4 },
    ]

    expect(deriveAuroraAssessment(hours)).toEqual({
      label: '資料不足',
      reason: '部分時段缺少雲量或 Kp 資料。',
    })
  })

  it('does not treat out-of-range numeric readings as a favorable condition', () => {
    expect(deriveAuroraAssessment([
      { time: '2026-10-14T21:00:00Z', cloudCover: 0, kp: -1 },
      { time: '2026-10-15T00:00:00Z', cloudCover: 20, kp: 4 },
    ])).toEqual({ label: '資料不足', reason: '部分時段缺少雲量或 Kp 資料。' })
  })

  it('uses public regional coordinates for manual and GPS choices', () => {
    expect(AURORA_CITIES.map(city => city.id)).toEqual(['reykjavik', 'vik', 'jokulsarlon', 'snaefellsnes', 'golden', 'hofn', 'keflavik'])
  })
})
