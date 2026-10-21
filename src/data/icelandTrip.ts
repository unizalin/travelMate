import {
  publicIcelandJourney,
  publicIcelandItems,
  publicIcelandTransports,
  publicPartySize,
} from '@/data/icelandPublic'

export interface PublicIcelandItem {
  id: string
  date: string
  name: string
  location: string | null
  order: number
  status: string
}

export interface PublicIcelandDay {
  date: string
  items: PublicIcelandItem[]
}

/** Public sharing intentionally carries no accommodation records. */
export const publicIcelandStays: never[] = []

export const publicIcelandDays: PublicIcelandDay[] = [...new Set([
  ...publicIcelandItems.map(item => item.date),
  ...publicIcelandTransports.flatMap(transport => [transport.departure.localDate, transport.arrival.localDate]),
])]
  .sort()
  .map(date => ({
    date,
    items: publicIcelandItems
      .filter(item => item.date === date)
      .sort((left, right) => left.order - right.order)
      .map(item => ({
        id: item.id,
        date: item.date,
        name: item.name,
        location: item.location,
        order: item.order,
        status: item.status,
      })),
  }))

export const icelandTrip = {
  id: publicIcelandJourney.tripId,
  slug: 'iceland',
  title: 'Iceland 2026',
  destination: '冰島 Iceland',
  startDate: '2026-10-30',
  endDate: '2026-11-07',
  timeZone: publicIcelandJourney.timeZone,
  partySize: publicPartySize,
  days: publicIcelandDays,
  flights: publicIcelandTransports
    .filter(transport => transport.kind === 'flight')
    .map(flight => ({
      name: flight.name,
      from: flight.departure.location,
      to: flight.arrival.location,
      date: flight.departure.localDate,
      departure: flight.departure.localTime,
      arrival: flight.arrival.localTime,
    })),
  suppliedOpeningHours: { 'public-iceland-stop-1': '10:00–21:00' } as Record<string, string>,
  onwardFlights: [
    { name: 'BR068', from: 'LHR', to: 'BKK', departureDate: '2026-11-07', departure: '21:20', arrival: '16:00', dateNote: 'BKK 抵達日期待補' },
    { name: 'BR068', from: 'BKK', to: 'TPE', departureDate: null, departure: '17:15', arrival: '21:50', dateNote: 'BKK 出發與 TPE 抵達日期待補' },
  ],
  alerts: [
    { tone: 'info' as 'info' | 'warning', title: '行程已確認', message: '依已確認版本安排；一般景點保留寬鬆節奏，已提供的 Tour 與航班時間固定標示。' },
    { tone: 'info' as 'info' | 'warning', title: '回程轉機日期待補', message: '11/7 保留 Blue Lagoon，離境與返台依各自選擇的航班；各航段時間為當地時間，BR068 未提供的跨日日期不自行推算。' },
  ],
} as const

export type PublicIcelandTrip = typeof icelandTrip
