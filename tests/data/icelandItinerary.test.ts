import { describe, expect, it } from 'vitest'
import { publicIcelandItems } from '@/data/icelandPublic'
import { icelandItems, icelandAccommodations } from '@/data/icelandJourney'
import { icelandTrip } from '@/data/icelandTrip'

describe('2026 Iceland itinerary seed', () => {
  it('keeps existing event IDs attached to their original activities while adding handbook stops', () => {
    const byName = new Map(publicIcelandItems.map(item => [item.name, item]))

    expect(byName.get('Kirkjufellsfoss')?.id).toBe('public-iceland-stop-2')
    expect(byName.get('Ytri Tunga')?.id).toBe('public-iceland-stop-4')
    expect(byName.get('Sky Lagoon')?.id).toBe('public-iceland-stop-5')
    expect(byName.get('Hali Blue Ice Cave Adventure')?.id).toBe('public-iceland-stop-25')
    expect(byName.get('Jökulsárlón觀景')?.id).toBe('public-iceland-stop-33')
    expect(byName.get('Zodiac Boat Tour')?.id).toBe('public-iceland-stop-29')
    expect(new Set(publicIcelandItems.map(item => item.id)).size).toBe(publicIcelandItems.length)
  })

  it('keeps the handbook order and all nine calendar days in public metadata', () => {
    const dayThree = publicIcelandItems.filter(item => item.date === '2026-11-03').map(item => item.name)
    expect(dayThree).toEqual(['Fjaðrárgljúfur', 'Diamond Beach', 'Vestrahorn'])
    expect(icelandTrip.days.map(day => day.date)).toEqual([
      '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03',
      '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07',
    ])
  })

  it('keeps the handbook public itinerary free of removed events and private details', () => {
    const names = publicIcelandItems.map(item => item.name)

    expect(names).not.toContain('Skaftafells Glacier TOUR')
    expect(names).toContain('Vatnajökull/Blue Iceland')
    expect(names).not.toContain('Jökulsárlón Viewpoint TOUR')
    expect(names).toContain('Volcano TOUR')
    expect(byNameDate('Blue Lagoon')).toBe('2026-11-07')
    expect(icelandTrip.alerts.map(alert => alert.title)).toContain('行程已確認')
    expect(publicIcelandItems.every(item => !item.name.includes('Hotel'))).toBe(true)
  })

  it('records confirmed tour times and onward flights without guessing arrival dates', () => {
    expect(publicIcelandItems.find(item => item.id === 'public-iceland-stop-25')).toMatchObject({ plannedStart: '2026-11-04T09:00:00Z', plannedEnd: '2026-11-04T15:00:00Z' })
    expect(publicIcelandItems.find(item => item.id === 'public-iceland-stop-29')).toMatchObject({ plannedStart: '2026-11-05T11:20:00Z', plannedEnd: '2026-11-05T13:20:00Z' })
    expect(icelandTrip.onwardFlights[0]).toMatchObject({ from: 'LHR', to: 'BKK', departureDate: '2026-11-07', departure: '21:20', arrival: '16:00' })
    expect(icelandTrip.onwardFlights[1]).toMatchObject({ from: 'BKK', to: 'TPE', departureDate: null, departure: '17:15', arrival: '21:50' })
    expect(publicIcelandItems.filter(item => item.date === '2026-10-31').map(item => item.name)).toEqual(['Ytri Tunga', 'Arnarstapi', 'Ingjaldshólskirkja', 'Kirkjufellsfoss', 'Sky Lagoon'])
    expect(publicIcelandItems.filter(item => item.date === '2026-11-02').map(item => item.name)).toEqual(['Seljalandsfoss', 'Skógafoss', 'Dyrhólaey', 'Reynisfjara', 'Black Crust Pizzeria'])
    expect(publicIcelandItems.filter(item => item.date === '2026-11-02').every(item => item.plannedStart === null && item.plannedEnd === null)).toBe(true)
    expect(publicIcelandItems.map(item => item.name)).not.toContain('Sólheimasandur Plane Wreck')
    expect(publicIcelandItems.map(item => item.name)).not.toContain('Víkurkirkja')
  })

  it('updates private accommodation seed without leaking it into the public snapshot', () => {
    expect(icelandAccommodations.map(stay => stay.name)).toEqual([
      'U16 by Stay in Iceland',
      'Aurora Igloo South',
      'The Barn',
      'Lækjarhus Farm Holidays',
      'Hotel Jökulsárlón - Glacier Lagoon Hotel',
      'Apartments Reykjavík',
      'Silica Hotel',
    ])
    expect(icelandItems.find(item => item.name === 'Hali Blue Ice Cave Adventure')?.id).toBe('iceland-stop-25')
    expect(icelandAccommodations.find(stay => stay.name === 'The Barn')).toMatchObject({ checkIn: '2026-11-02', checkOut: '2026-11-03' })
    expect(icelandAccommodations.find(stay => stay.name === 'Silica Hotel')).toMatchObject({ checkIn: '2026-11-06', checkOut: '2026-11-07' })
  })
})

function byNameDate(name: string): string | undefined {
  return publicIcelandItems.find(item => item.name === name)?.date
}
