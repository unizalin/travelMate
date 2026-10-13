import type { JourneyAccommodation, JourneyGroup, JourneyItem, JourneyMember, JourneyTransport, TripJourney } from '@/domain/tripJourney'
import { publicIcelandItems, publicIcelandTransports } from '@/data/icelandPublic'

export const ICELAND_TRIP_ID = 'tripbook-iceland-2026'
export const ICELAND_TIME_ZONE = 'Atlantic/Reykjavik'

export const icelandMembers: JourneyMember[] = Array.from({ length: 6 }, (_, index) => ({
  id: `member-${index + 1}`,
  tripId: ICELAND_TRIP_ID,
  displayName: null,
  accountId: null,
}))

export const icelandGroups: JourneyGroup[] = [1, 2, 3].map(index => ({
  id: `group-${index}`,
  tripId: ICELAND_TRIP_ID,
  name: `群組 ${index}`,
  memberIds: [],
  membershipConfirmed: false,
}))

const privateStopDetails: Record<string, Pick<JourneyItem, 'photoTip' | 'notes'>> = {
  'Costco Wholesale Iceland': { notes: '抵達後採買旅程物資。' },
  'Þingvellir': { photoTip: '建議 08:00–09:00 拍攝；此為攝影提示，尚未預約。' },
  'Strokkur': { photoTip: '可從側邊平台取景；此為攝影提示，尚未預約。' },
  'Gullfoss': { photoTip: '下午較有機會遇到彩虹；此為攝影提示，尚未預約。' },
  'Seljalandsfoss': { photoTip: '建議早點抵達並攜帶雨衣；此為攝影提示，尚未預約。' },
  'Reynisfjara': { photoTip: '建議日落前抵達；此為攝影提示，尚未預約。' },
  'Blue Lagoon': { notes: '與返程航班的機場時程仍需確認。' },
}

/**
 * The public snapshot owns the shared stop order and locations. Private-only
 * details are layered on here and never imported by the standalone share entry.
 */
export const icelandItems: JourneyItem[] = publicIcelandItems.map((item, index) => ({
  ...item,
  id: `iceland-stop-${index + 1}`,
  participation: 'all',
  photoTip: privateStopDetails[item.name]?.photoTip ?? null,
  notes: privateStopDetails[item.name]?.notes ?? null,
}))

export const icelandTransports: JourneyTransport[] = publicIcelandTransports.map((transport, index) => ({
  ...transport,
  id: index === 0 ? 'iceland-flight-out' : 'iceland-flight-home',
  tripId: ICELAND_TRIP_ID,
  departure: { ...transport.departure },
  arrival: { ...transport.arrival },
  participantIds: [],
  notes: '乘客待確認；不代表全員搭乘。',
}))

export const icelandAccommodations: JourneyAccommodation[] = [
  ['Reykjavík', '2026-10-30', '2026-11-01'],
  ['Aurora Igloo South', '2026-11-01', '2026-11-02'],
  ['Vík', '2026-11-02', '2026-11-03'],
  ['Höfn', '2026-11-03', '2026-11-04'],
  ['Hótel Jökulsárlón - Glacier Lagoon Hotel', '2026-11-04', '2026-11-05'],
  ['Reykjavík', '2026-11-05', '2026-11-06'],
  ['Silica Hotel', '2026-11-06', '2026-11-07'],
].map(([name, checkIn, checkOut], index) => ({
  id: `iceland-stay-${index + 1}`,
  tripId: ICELAND_TRIP_ID,
  name,
  checkIn,
  checkOut,
  // Guest assignments remain unknown until the group confirms who is staying.
  participantIds: [],
  rooms: [],
  benefits: [],
}))

export const icelandJourney: TripJourney = {
  tripId: ICELAND_TRIP_ID,
  timeZone: ICELAND_TIME_ZONE,
  members: icelandMembers,
  groups: icelandGroups,
  items: icelandItems,
  transports: icelandTransports,
  accommodations: icelandAccommodations,
}
