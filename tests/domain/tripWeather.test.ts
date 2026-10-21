import { describe, expect, it } from 'vitest'
import { clothingAdvice, equipmentForActivities, weatherRegionsForDate } from '@/domain/tripWeather'

const conditions = { apparentMin: -3, apparentMax: 3, precipitation: 4, snowfall: 0, wind: 9, gusts: 17 }

describe('Daily travel preparation', () => {
  it('uses apparent temperature, rain and wind together for clothing suggestions', () => {
    const advice = clothingAdvice(conditions)
    expect(advice).toMatch(/保暖/)
    expect(advice).toMatch(/防水/)
    expect(advice).toMatch(/帽|手套/)
    expect(advice?.length).toBeLessThan(40)
    expect(advice?.match(/。/g)).toHaveLength(1)
  })
  it('does not infer a daily outfit from missing measurements', () => {
    expect(clothingAdvice({ ...conditions, apparentMin: null })).toBeNull()
    expect(clothingAdvice({ ...conditions, gusts: null })).toBeNull()
  })
  it('accepts real zero values without confusing them with missing weather', () => {
    expect(clothingAdvice({ apparentMin: 10, apparentMax: 15, precipitation: 0, snowfall: 0, wind: 0, gusts: 0 })).not.toBeNull()
  })
  it('changes reference regions with the itinerary and does not fall back for unknown days', () => {
    expect(weatherRegionsForDate('2026-11-02').map(region => region.label).join()).toContain('Vík')
    expect(weatherRegionsForDate('2026-11-05').length).toBe(2)
    expect(weatherRegionsForDate('2026-12-01')).toEqual([])
  })
  it('derives packing reminders from the selected activities without asserting provider equipment', () => {
    expect(equipmentForActivities(['Blue Lagoon']).join()).toContain('泳衣')
    expect(equipmentForActivities(['Hali Blue Ice Cave Adventure']).join()).toContain('業者')
    expect(equipmentForActivities(['Costco Wholesale Iceland'])).toEqual([])
  })
})
