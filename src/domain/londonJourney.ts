import type { JourneyItem, TripJourney } from '@/domain/tripJourney'
import { londonPrelude } from '@/data/londonPrelude'
export function londonSeedItems(tripId: string): JourneyItem[] {
  const make = (id: string, date: string, name: string, notes: string, order: number, fallback = false): JourneyItem => ({
    id, tripId, date, name, location: date === '2026-10-26' ? 'London／Cambridge' : 'London', order,
    notes, plannedStart: null, plannedEnd: null, actualStart: null, actualEnd: null,
    status: fallback ? 'fallback' : 'planned', participation: [...londonPrelude.memberIds],
  })
  return [
    ...londonPrelude.days.flatMap(day => day.stops.map((stop,index) => make(`london-${day.date}-${index + 1}`,day.date,stop.name,stop.note,index + 1))),
    ...londonPrelude.alternativePlaces.map((name,index) => make(`london-alternative-place-${index + 1}`,'2026-10-29',name,'備選景點，未指定造訪日期。',100 + index,true)),
    ...londonPrelude.alternativeRestaurants.map((name,index) => make(`london-alternative-food-${index + 1}`,'2026-10-29',name,'備選餐廳，未指定用餐日期。',200 + index,true)),
  ]
}
export const londonItemsForDay = (items: JourneyItem[],date: string) => items.filter(item => item.id.startsWith('london-') && item.date === date && item.status !== 'fallback').sort((a,b) => a.order - b.order)

/** A cached nine-day copy can accept a purely additive London import without a version choice. */
export function isOnlyLondonAddition(local: TripJourney, remote: TripJourney): boolean {
  if (local.tripId !== remote.tripId || local.items.some(item => item.id.startsWith('london-')) || !remote.items.some(item => item.id.startsWith('london-'))) return false
  const remoteCore = { ...remote, items: remote.items.filter(item => !item.id.startsWith('london-')), groups: remote.groups.filter(group => group.id !== 'london-early') }
  return JSON.stringify(local) === JSON.stringify(remoteCore)
}
