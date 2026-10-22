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

  it('returns insufficient data when no matched hour has both cloud and Kp', () => {
    const hours: AuroraHour[] = [
      { time: '2026-10-14T21:00:00Z', cloudCover: 20, kp: null },
      { time: '2026-10-15T00:00:00Z', cloudCover: null, kp: 4 },
    ]

    expect(deriveAuroraAssessment(hours)).toEqual({
      label: '資料不足',
      reason: '部分時段缺少雲量或 Kp 資料。',
    })
  })

  it('uses public regional coordinates for manual and GPS choices', () => {
    expect(AURORA_CITIES.map(city => city.id)).toEqual(['reykjavik', 'vik', 'jokulsarlon', 'snaefellsnes', 'golden', 'hofn', 'keflavik'])
  })
})

describe('aurora assessment', () => {
  const hour = (cloudCover: number | null, kp: number | null = 4): AuroraHour => ({
    time: '2026-10-22T21:00:00Z', cloudCover, kp,
  })

  it('reports insufficient data when there are no night hours', () => {
    expect(deriveAuroraAssessment([])).toEqual({
      label: '資料不足', reason: '目前沒有同時段的夜間預報資料。',
    })
  })

  it.each([
    { clouds: [0, 20, 30], label: '雲量條件較佳', reason: '目前配對到的夜間時段雲量較少；Kp 僅供活動強弱參考。' },
    { clouds: [30, 31, 80], label: '部分時段晴朗', reason: '今晚部分時段雲量較少，其餘時段雲量較多；請以最佳觀測時段為準。' },
    { clouds: [31, 50, 69], label: '雲量中等', reason: '今晚各時段雲量中等，沒有特別晴朗的時段。' },
    { clouds: [70, 80, 100], label: '雲量偏多', reason: '目前配對到的夜間時段雲量偏多；Kp 僅供活動強弱參考。' },
    { clouds: [31, 80], label: '雲量中等', reason: '今晚各時段雲量中等，沒有特別晴朗的時段。' },
  ])('classifies $clouds as $label', ({ clouds, label, reason }) => {
    expect(deriveAuroraAssessment(clouds.map(cloud => hour(cloud)))).toEqual({ label, reason })
  })

  it('uses valid hours and explains omitted edge hours', () => {
    expect(deriveAuroraAssessment([hour(10), hour(80), hour(null), hour(20, null)])).toEqual({
      label: '部分時段晴朗',
      reason: '今晚部分時段雲量較少，其餘時段雲量較多；請以最佳觀測時段為準。（部分時段缺資料，依其餘時段判定）',
    })
  })

  it.each([
    hour(null), hour(NaN), hour(Infinity), hour(-1), hour(101),
    hour(0, null), hour(0, NaN), hour(0, Infinity), hour(0, -1), hour(0, 10),
  ])('excludes an invalid reading without discarding valid hours: %j', invalid => {
    expect(deriveAuroraAssessment([invalid])).toEqual({
      label: '資料不足', reason: '部分時段缺少雲量或 Kp 資料。',
    })
    expect(deriveAuroraAssessment([invalid, hour(30, 0)])).toEqual({
      label: '雲量條件較佳',
      reason: '目前配對到的夜間時段雲量較少；Kp 僅供活動強弱參考。（部分時段缺資料，依其餘時段判定）',
    })
  })

  it('does not use Kp strength to choose the cloud label', () => {
    expect(deriveAuroraAssessment([hour(20, 0), hour(80, 0)]))
      .toEqual(deriveAuroraAssessment([hour(20, 9), hour(80, 9)]))
  })
})
