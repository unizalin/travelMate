import { describe, expect, it } from 'vitest'
import { publicIcelandJourney, publicPartySize } from '@/data/icelandPublic'
import { publicLondonJourney } from '@/data/londonPublic'
import { londonItinerary } from '@/data/londonItinerary'

describe('public Iceland journey snapshot', () => {
  it('contains only the shared itinerary and aggregate party size', () => {
    expect(publicPartySize).toBe(6)
    expect(publicIcelandJourney.memos).toBeUndefined()
    expect(publicIcelandJourney.members).toEqual([])
    expect(publicIcelandJourney.groups).toEqual([])
    expect(publicIcelandJourney.accommodations).toEqual([])
    expect(publicIcelandJourney.items.every(item => item.photoTip == null)).toBe(true)
    expect(publicIcelandJourney.items.every(item => item.photoSpots == null)).toBe(true)
    expect(publicIcelandJourney.transports.every(transport => transport.participantIds.length === 0 && transport.notes == null)).toBe(true)
    expect(JSON.stringify(publicIcelandJourney)).not.toMatch(/member-\d|group-\d|Hótel|Aurora Igloo|Silica Hotel|攝影提示/)
  })

  it('publishes London dates and activity notes without identities, assignments or private fields', () => {
    expect(publicLondonJourney.members).toEqual([])
    expect(publicLondonJourney.groups).toEqual([])
    expect(publicLondonJourney.transports).toEqual([])
    expect(publicLondonJourney.memos).toBeUndefined()
    expect(publicLondonJourney.items.filter(item => item.status !== 'fallback').map(item => [item.date,item.name,item.notes])).toEqual(londonItinerary.days.flatMap(day => day.stops.map(stop => [day.date,stop.name,stop.note])))
    expect(publicLondonJourney.items.every(item => item.participation == null && item.photoTip == null && item.photoSpots == null)).toBe(true)
    expect(publicLondonJourney.accommodations.every(stay => !stay.participantIds.length && !stay.rooms.length)).toBe(true)
    expect(publicLondonJourney.accommodations.every(stay => stay.checkIn >= '2026-10-24' && stay.checkIn <= '2026-10-29' && stay.checkOut <= '2026-10-30')).toBe(true)
    expect(JSON.stringify(publicLondonJourney)).not.toMatch(/jinyo|Kevin Ho|Rosanne|YU|member-\d|accountId|memos|photoSpots/)
  })
})
