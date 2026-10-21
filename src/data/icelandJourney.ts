import type { JourneyAccommodation, JourneyGroup, JourneyItem, JourneyMember, JourneyTransport, TripJourney } from '@/domain/tripJourney'
import { publicIcelandItems, publicIcelandTransports } from '@/data/icelandPublic'
import { icelandPhotoSpots } from '@/data/icelandPhotography'

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
  'Costco Wholesale Iceland': { notes: '使用者提供營業時間 10:00–21:00；抵達後採買旅程物資。' },
  'Þingvellir': { photoTip: '建議 08:00–09:00 拍攝；此為攝影提示，尚未預約。' },
  'Strokkur': { photoTip: '可從側邊平台取景；此為攝影提示，尚未預約。' },
  'Gullfoss': { photoTip: '下午較有機會遇到彩虹；此為攝影提示，尚未預約。' },
  'Seljalandsfoss': { photoTip: '使用者筆記：日出或早上；Gljúfrabúi 作延伸點，攜帶雨衣。' },
  'Reynisfjara': { photoTip: '使用者筆記：日落前約一小時抵達。' },
  'Hali Blue Ice Cave Adventure': { notes: 'Glacier Adventure Base Camp；使用者確認活動時段 09:00–15:00。' },
  'Blue Lagoon': { notes: '11/7 安排；使用者註記 Aurora call、附早餐，服務細節依訂單確認。' },
  'Zodiac Boat Tour': { notes: 'icelagoon.com；使用者確認活動時段 11:20–13:20。' },
}

/**
 * The public snapshot owns the shared stop order and locations. Private-only
 * details are layered on here and never imported by the standalone share entry.
 */
export const icelandItems: JourneyItem[] = publicIcelandItems.map((item) => ({
  ...item,
  id: item.id.replace('public-', ''),
  participation: 'all',
  photoTip: privateStopDetails[item.name]?.photoTip ?? null,
  notes: privateStopDetails[item.name]?.notes ?? null,
  photoSpots: icelandPhotoSpots[item.name]?.map(spot => ({ ...spot })),
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
  ['U16 by Stay in Iceland', '2026-10-30', '2026-11-01'],
  ['Aurora Igloo South', '2026-11-01', '2026-11-02'],
  ['The Barn', '2026-11-02', '2026-11-03'],
  ['Lækjarhus Farm Holidays', '2026-11-03', '2026-11-04'],
  ['Hotel Jökulsárlón - Glacier Lagoon Hotel', '2026-11-04', '2026-11-05'],
  ['Apartments Reykjavík', '2026-11-05', '2026-11-06'],
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
