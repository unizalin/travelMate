import { describe, expect, it } from 'vitest'
import { publicIcelandJourney, publicPartySize } from '@/data/icelandPublic'

describe('public Iceland journey snapshot', () => {
  it('contains only the shared itinerary and aggregate party size', () => {
    expect(publicPartySize).toBe(6)
    expect(publicIcelandJourney.members).toEqual([])
    expect(publicIcelandJourney.groups).toEqual([])
    expect(publicIcelandJourney.accommodations).toEqual([])
    expect(publicIcelandJourney.items.every(item => item.photoTip == null && item.notes == null)).toBe(true)
    expect(publicIcelandJourney.transports.every(transport => transport.participantIds.length === 0 && transport.notes == null)).toBe(true)
    expect(JSON.stringify(publicIcelandJourney)).not.toMatch(/member-\d|group-\d|Hótel|Aurora Igloo|Silica Hotel|攝影提示/)
  })
})
