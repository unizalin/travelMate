import type { JourneyItem, JourneyTransport, TripJourney } from '@/domain/tripJourney'

/**
 * Deliberately separate from the private planning seed.  This module is the
 * only journey data imported by the standalone share entry, so member slots,
 * group assignments, accommodation names, passenger IDs, and private notes
 * cannot be pulled into the public bundle by accident.
 */
export const PUBLIC_ICELAND_TRIP_ID = 'tripbook-iceland-2026'
export const PUBLIC_ICELAND_TIME_ZONE = 'Atlantic/Reykjavik'
export const publicPartySize = 6

const sharedStops: Array<{ date: string; name: string; location: string }> = [
  { date: '2026-10-30', name: 'Costco Wholesale Iceland', location: 'Reykjavík' },
  { date: '2026-10-31', name: 'Kirkjufellsfoss', location: 'Grundarfjörður' },
  { date: '2026-10-31', name: 'Ingjaldshólskirkja', location: 'Snæfellsnes' },
  { date: '2026-10-31', name: 'Ytri Tunga', location: 'Snæfellsnes' },
  { date: '2026-10-31', name: 'Sky Lagoon', location: 'Kópavogur' },
  { date: '2026-11-01', name: 'Þingvellir', location: 'Þingvellir' },
  { date: '2026-11-01', name: 'Brúarfoss', location: 'Bláskógabyggð' },
  { date: '2026-11-01', name: 'Strokkur', location: 'Haukadalur' },
  { date: '2026-11-01', name: 'Gullfoss', location: 'Hvítá' },
  { date: '2026-11-01', name: 'Kerið', location: 'Grímsnes' },
  { date: '2026-11-02', name: 'Seljalandsfoss', location: '南岸' },
  { date: '2026-11-02', name: 'Skógafoss', location: '南岸' },
  { date: '2026-11-02', name: 'Sólheimasandur Plane Wreck', location: 'Sólheimasandur' },
  { date: '2026-11-02', name: 'Reynisfjara', location: 'Vík' },
  { date: '2026-11-03', name: 'Fjaðrárgljúfur', location: 'Skaftárhreppur' },
  { date: '2026-11-03', name: 'Diamond Beach', location: 'Jökulsárlón' },
  { date: '2026-11-04', name: 'Skaftafells Glacier TOUR', location: 'Skaftafell' },
  { date: '2026-11-04', name: 'Vatnajökull/Blue Iceland', location: 'Vatnajökull' },
  { date: '2026-11-05', name: 'Jökulsárlón Viewpoint TOUR', location: 'Jökulsárlón' },
  { date: '2026-11-05', name: 'Reykjavík return', location: 'Reykjavík' },
  { date: '2026-11-06', name: 'Volcano TOUR', location: 'Reykjanes' },
  { date: '2026-11-06', name: 'Reykjavík City Walk', location: 'Reykjavík' },
  { date: '2026-11-06', name: 'Hallgrímskirkja', location: 'Reykjavík' },
  { date: '2026-11-07', name: 'Blue Lagoon', location: 'Grindavík' },
]

export const publicIcelandItems: JourneyItem[] = sharedStops.map((stop, index) => ({
  id: `public-iceland-stop-${index + 1}`,
  date: stop.date,
  name: stop.name,
  location: stop.location,
  order: sharedStops.slice(0, index).filter(candidate => candidate.date === stop.date).length + 1,
  plannedStart: null,
  plannedEnd: null,
  actualStart: null,
  actualEnd: null,
  status: index === 0 ? 'next' : 'planned',
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
