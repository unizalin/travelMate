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

export const publicIcelandDays: PublicIcelandDay[] = [...new Set(publicIcelandItems.map(item => item.date))]
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
  alerts: [
    {
      tone: 'warning',
      title: 'Nov 7 行程需要確認',
      message: 'Blue Lagoon 與 11:55 從 KEF 起飛的 BA801 之間，接駁與入場時段尚未確認。',
    },
    {
      tone: 'info',
      title: '資訊仍在規劃中',
      message: '公開閱讀只提供共享日期、地點與交通摘要；詳細住宿與攝影提示留在私人規劃。',
    },
  ],
} as const

export type PublicIcelandTrip = typeof icelandTrip
