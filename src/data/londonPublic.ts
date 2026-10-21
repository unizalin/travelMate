import type { JourneyAccommodation, JourneyItem, TripJourney } from '@/domain/tripJourney'
import { PUBLIC_ICELAND_TRIP_ID } from './icelandPublic'
import { londonItinerary } from './londonItinerary'

const makeItem = (id: string, date: string, name: string, notes: string, order: number, fallback = false): JourneyItem => ({
  id, date, name, notes, order,
  location: date === '2026-10-26' ? 'London／Cambridge' : 'London',
  plannedStart: null, plannedEnd: null, actualStart: null, actualEnd: null,
  status: fallback ? 'fallback' : 'planned',
})

export const publicLondonItems: JourneyItem[] = [
  ...londonItinerary.days.flatMap(day => day.stops.map((stop, index) => makeItem(`london-${day.date}-${index + 1}`, day.date, stop.name, stop.note, index + 1))),
  ...londonItinerary.alternativePlaces.map((name, index) => makeItem(`london-alternative-place-${index + 1}`, '2026-10-29', name, '備選景點，未指定造訪日期。', 100 + index, true)),
  ...londonItinerary.alternativeRestaurants.map((name, index) => makeItem(`london-alternative-food-${index + 1}`, '2026-10-29', name, '備選餐廳，未指定用餐日期。', 200 + index, true)),
]

// No confirmed London accommodation was supplied. Keep assignments and rooms out of the public snapshot.
export const publicLondonAccommodations: JourneyAccommodation[] = []

export const publicLondonJourney: TripJourney = {
  tripId: PUBLIC_ICELAND_TRIP_ID,
  timeZone: londonItinerary.timeZone,
  members: [], groups: [], transports: [],
  items: publicLondonItems,
  accommodations: publicLondonAccommodations,
}
