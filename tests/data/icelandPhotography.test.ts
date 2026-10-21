import { describe, expect, it } from 'vitest'
import { icelandPhotoSpots } from '@/data/icelandPhotography'
import { icelandJourney } from '@/data/icelandJourney'
import { photoSpotsForItem, validateJourney } from '@/domain/tripJourney'

describe('Iceland photography references', () => {
  it('maps only current itinerary places and validates shared spots', () => {
    const mapped = icelandJourney.items.filter(item => (item.photoSpots?.length ?? 0) > 0)
    expect(mapped.length).toBeGreaterThan(10)
    expect(Object.keys(icelandPhotoSpots)).toEqual(expect.arrayContaining(mapped.map(item => item.name)))
    expect(validateJourney(icelandJourney).valid).toBe(true)
  })

  it('supports multiple device-specific spots and missing coordinates', () => {
    const cave = icelandJourney.items.find(item => item.name === 'Hali Blue Ice Cave Adventure')!
    expect(photoSpotsForItem(cave)).toHaveLength(2)
    expect(photoSpotsForItem(cave).some(spot => spot.device === 'camera')).toBe(true)
    expect(photoSpotsForItem(cave)[0].latitude).toBeUndefined()
  })

  it('keeps legacy photoTip text alongside structured spots', () => {
    const falls = icelandJourney.items.find(item => item.name === 'Seljalandsfoss')!
    expect(falls.photoTip).toContain('日出')
    expect(falls.photoSpots?.length).toBeGreaterThan(0)
  })
})
