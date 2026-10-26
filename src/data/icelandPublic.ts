import { sharedStops } from '../../shared/iceland-stops.mjs'
import { icelandPhotoSpots, icelandPhotoTips } from './icelandPhotography'
import type { JourneyItem, JourneyTransport, TripJourney } from '@/domain/tripJourney'

/**
 * Deliberately separate from the private planning seed.  This module is the
 * Iceland snapshot used by the standalone share entry, so member slots,
 * group assignments, accommodation names, passenger IDs, and private notes
 * cannot be pulled into the public bundle by accident. London has a separate
 * public snapshot containing itinerary content without participant identities.
 */
export const PUBLIC_ICELAND_TRIP_ID = 'tripbook-iceland-2026'
export const PUBLIC_ICELAND_TIME_ZONE = 'Atlantic/Reykjavik'
export const publicPartySize = 6


const bookNotes: Record<string, string> = {
  'public-iceland-stop-11': '瀑布後方步道僅在開放且無嚴重結冰時進入',
  'public-iceland-stop-14': '在指定觀景區停留，只走安全區',
}
const bookReminders: Record<string, string> = {
  'public-iceland-stop-12': '水霧非常大，人和相機都會濕，拍完先擦乾再收',
  'public-iceland-stop-14': '永遠面向海、遵守警示燈與封閉線；浪退得遠不代表安全',
}
export const publicIcelandItems: JourneyItem[] = sharedStops.map((stop, index) => ({
  id: stop.id,
  date: stop.date,
  name: stop.name,
  photoSpots: icelandPhotoSpots[stop.name],
  photoTip: icelandPhotoTips[stop.name] ?? null,
  location: stop.location,
  order: sharedStops.slice(0, index).filter(candidate => candidate.date === stop.date).length + 1,
  plannedStart: stop.id === 'public-iceland-stop-25' ? '2026-11-04T09:00:00Z' : stop.id === 'public-iceland-stop-29' ? '2026-11-05T11:20:00Z' : null,
  plannedEnd: stop.id === 'public-iceland-stop-25' ? '2026-11-04T15:00:00Z' : stop.id === 'public-iceland-stop-29' ? '2026-11-05T13:20:00Z' : null,
  actualStart: null,
  actualEnd: null,
  status: index === 0 ? 'next' : 'planned',
  notes: bookNotes[stop.id] ?? null,
  reminder: bookReminders[stop.id] ?? null,
}))

export const publicIcelandTransports: JourneyTransport[] = [
  {
    id: 'public-iceland-flight-out',
    tripId: PUBLIC_ICELAND_TRIP_ID,
    kind: 'flight',
    name: 'BA802',
    departure: { location: 'LHR', localDate: '2026-10-30', localTime: '13:50', timeZone: 'Europe/London' },
    arrival: { location: 'KEF', localDate: '2026-10-30', localTime: '17:15', timeZone: PUBLIC_ICELAND_TIME_ZONE },
    participantIds: [],
    status: 'planned',
    actualStart: null,
    actualEnd: null,
  },
  {
    id: 'public-iceland-flight-home',
    tripId: PUBLIC_ICELAND_TRIP_ID,
    kind: 'flight',
    name: 'BA801',
    departure: { location: 'KEF', localDate: '2026-11-07', localTime: '11:55', timeZone: PUBLIC_ICELAND_TIME_ZONE },
    arrival: { location: 'LHR', localDate: '2026-11-07', localTime: '15:05', timeZone: 'Europe/London' },
    participantIds: [],
    status: 'planned',
    actualStart: null,
    actualEnd: null,
  },
]

export const publicIcelandJourney: TripJourney = {
  tripId: PUBLIC_ICELAND_TRIP_ID,
  timeZone: PUBLIC_ICELAND_TIME_ZONE,
  members: [],
  groups: [],
  items: publicIcelandItems,
  transports: publicIcelandTransports,
  accommodations: [],
}
