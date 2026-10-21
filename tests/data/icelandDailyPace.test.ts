import { describe, expect, it } from 'vitest'
import { icelandDailyPace } from '@/data/icelandDailyPace'
import { publicIcelandDays } from '@/data/icelandTrip'

describe('daily Iceland Plan B guidance', () => {
  it('covers all nine trip dates with specific keep and cut priorities', () => {
    expect(Object.keys(icelandDailyPace)).toEqual(publicIcelandDays.map(day => day.date))
    expect(Object.keys(icelandDailyPace)).toHaveLength(9)
    for (const day of Object.values(icelandDailyPace)) {
      expect(day.keep.length).toBeGreaterThan(0)
      expect(day.skip.length).toBeGreaterThan(0)
    }
    expect(icelandDailyPace['2026-11-02']).toEqual({
      keep: 'Seljalandsfoss、Skógafoss、Dyrhólaey、Reynisfjara 與晚餐',
      skip: 'Gljúfrabúi 延伸步道；強風或封閉時取消非必要停留',
    })
  })
  it('uses current volcano and lagoon priorities while keeping private details outside the public guidance', () => {
    expect(icelandDailyPace['2026-11-06'].keep).toContain('火山 TOUR')
    expect(icelandDailyPace['2026-11-07'].keep).toContain('Blue Lagoon')
    expect(JSON.stringify(icelandDailyPace)).not.toMatch(/Silica Hotel|U16|TWD|updatedBy|member-1|共用 Memo/)
    expect(JSON.stringify(icelandDailyPace)).not.toContain('依業者通知調整銜接')
  })
})
