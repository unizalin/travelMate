export const JOURNEY_STATUSES = [
  'planned',
  'next',
  'completed',
  'skipped',
  'cancelled',
  'fallback',
] as const

export type JourneyStatus = (typeof JOURNEY_STATUSES)[number]

export const TRANSPORT_KINDS = [
  'flight',
  'train',
  'bus',
  'car',
  'ferry',
  'transfer',
  'other',
] as const

export type TransportKind = (typeof TRANSPORT_KINDS)[number]

export type JourneyParticipation =
  | 'all'
  | string[]
  | {
      mode?: 'all' | 'include' | 'exclude'
      memberIds?: string[]
      participantIds?: string[]
      includedMemberIds?: string[]
      excludedMemberIds?: string[]
    }

export interface JourneyMember {
  id: string
  tripId: string
  displayName: string | null
  accountId: string | null
}

export const PHOTO_SPOT_DEVICES = ['phone', 'camera', 'both'] as const
export type PhotoSpotDevice = (typeof PHOTO_SPOT_DEVICES)[number]

export interface PhotoSpot {
  id: string
  title: string
  device: PhotoSpotDevice
  composition: string
  suggestedTime?: string | null
  latitude?: number | null
  longitude?: number | null
  safetyNote?: string | null
  sourceLabel: string
}

export interface JourneyGroup {
  id: string
  tripId: string
  name: string
  memberIds: string[]
  membershipConfirmed: boolean
}

export interface JourneyItem {
  id: string
  date: string
  name: string
  location: string | null
  order: number
  plannedStart: string | null
  plannedEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  status: JourneyStatus
  /** Omitted participation means the shared default: every member. */
  participation?: JourneyParticipation
  notes?: string | null
  reminder?: string | null
  photoTip?: string | null
  photoSpots?: PhotoSpot[]
  /** Kept optional because items in the staging document are trip-scoped by their parent. */
  tripId?: string
}

export interface JourneyTransportPoint {
  location: string
  localDate: string
  localTime: string | null
  timeZone: string
}

export interface JourneyTransport {
  id: string
  tripId: string
  kind: TransportKind
  name: string
  departure: JourneyTransportPoint
  arrival: JourneyTransportPoint
  participantIds: string[]
  status: JourneyStatus
  actualStart: string | null
  actualEnd: string | null
  notes?: string | null
}

export interface JourneyRoom {
  id: string
  name: string
  participantIds: string[]
  /** Accepted while reading older staging documents; editors write participantIds. */
  memberIds?: string[]
  occupantIds?: string[]
  notes?: string | null
}

export interface JourneyAccommodation {
  id: string
  tripId: string
  name: string
  checkIn: string
  checkOut: string
  participantIds: string[]
  rooms: JourneyRoom[]
  benefits: string[]
  notes?: string | null
}

export interface JourneyMemo {
  content: string
  updatedBy: string | null
  updatedAt: string | null
  updatedByName?: string | null
}

export interface TripJourney {
  tripId: string
  timeZone: string
  members: JourneyMember[]
  groups: JourneyGroup[]
  items: JourneyItem[]
  transports: JourneyTransport[]
  accommodations: JourneyAccommodation[]
  /** Private shared memos keyed by stable activity ID; omitted from public journeys. */
  dayPlans?: Record<string, { keep: string; skip: string }>
  memos?: Record<string, JourneyMemo>
}

export interface JourneyValidationResult {
  valid: boolean
  errors: string[]
}

export interface TimelineEvent {
  id: string
  date: string
  name: string
  type: 'item' | 'transport' | 'accommodation'
  /** Null means the source did not provide a reliable time. */
  sortAt: number | null
  /** Stable source order keeps unknown-time entries from being guessed at midnight. */
  sourceOrder: number
  location?: string | null
  participation?: JourneyParticipation
  transportPhase?: 'departure' | 'arrival'
  pendingParticipation?: boolean
  item?: JourneyItem
  transport?: JourneyTransport
  accommodation?: JourneyAccommodation
}

export interface DailyTimeline {
  date: string
  events: TimelineEvent[]
}

export interface JourneyStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const CLOCK_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/
const JOURNEY_LOCAL_KEY_PREFIX = 'tripbook:journey'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isValidClock(value: unknown): value is string {
  return typeof value === 'string' && CLOCK_PATTERN.test(value)
}

function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

function hasDuplicateIds(ids: string[]): boolean {
  return new Set(ids).size !== ids.length
}

function parseDateParts(value: string): [number, number, number] {
  const [year, month, day] = value.split('-').map(Number)
  return [year, month, day]
}

function offsetAt(date: Date, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const offsetPart = parts.find(part => part.type === 'timeZoneName')?.value ?? 'GMT'
    if (offsetPart === 'GMT' || offsetPart === 'UTC') return 0
    const match = offsetPart.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/)
    if (!match) return null
    const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0)
    return (match[1] === '-' ? -1 : 1) * minutes * 60_000
  } catch {
    return null
  }
}

function localPartsAt(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`
}

/**
 * Resolve a local wall-clock value into one instant. Ambiguous daylight-saving
 * times are intentionally rejected: a planner must keep them pending until a
 * person chooses the intended instant.
 */
export function instantForLocalDateTime(localDate: string, localTime: string, timeZone: string): number | null {
  if (!isValidDate(localDate) || !isValidClock(localTime) || !isValidTimeZone(timeZone)) return null
  const [year, month, day] = parseDateParts(localDate)
  const [hour, minute, second = 0] = localTime.split(':').map(Number)
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  const offsets = new Set<number>()

  for (const delta of [-172_800_000, -86_400_000, 0, 86_400_000, 172_800_000]) {
    const offset = offsetAt(new Date(localAsUtc + delta), timeZone)
    if (offset !== null) offsets.add(offset)
  }

  const candidates = [...offsets]
    .map(offset => localAsUtc - offset)
    .filter(candidate => localPartsAt(new Date(candidate), timeZone) === `${localDate}T${localTime.length === 5 ? `${localTime}:00` : localTime}`)

  return candidates.length === 1 ? candidates[0] : null
}

function instantForDateTime(value: string | null | undefined, timeZone: string, dateFallback?: string): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  if (!Number.isNaN(parsed) && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return parsed
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)$/)
  if (match) return instantForLocalDateTime(match[1], match[2], timeZone)
  if (dateFallback && isValidClock(value)) return instantForLocalDateTime(dateFallback, value, timeZone)
  return null
}

function dateAtInstant(instant: number | null, timeZone: string, fallback: string): string {
  return instant === null ? fallback : localPartsAt(new Date(instant), timeZone).slice(0, 10)
}

function validateParticipation(
  participation: unknown,
  memberIds: Set<string>,
  path: string,
  errors: string[],
): void {
  if (participation === undefined) return
  if (participation === 'all') return
  if (Array.isArray(participation)) {
    if (hasDuplicateIds(participation) || participation.some(id => typeof id !== 'string' || !memberIds.has(id))) {
      errors.push(`${path} contains an unknown or duplicate participant`)
    }
    return
  }
  if (!isRecord(participation)) {
    errors.push(`${path} must be all or an explicit participant set`)
    return
  }
  const mode = participation.mode
  if (mode !== undefined && mode !== 'all' && mode !== 'include' && mode !== 'exclude') {
    errors.push(`${path}.mode is invalid`)
  }
  const aliases = ['memberIds', 'participantIds', 'includedMemberIds', 'excludedMemberIds'] as const
  const providedAliases = aliases.filter(alias => participation[alias] !== undefined)
  if (mode === 'all' && providedAliases.length === 0) return
  if (providedAliases.length === 0) {
    errors.push(`${path} must include an explicit participant set`)
    return
  }
  for (const alias of providedAliases) {
    const ids = participation[alias]
    if (!Array.isArray(ids) || hasDuplicateIds(ids) || ids.some(id => typeof id !== 'string' || !memberIds.has(id))) {
      errors.push(`${path}.${alias} contains an unknown or duplicate participant`)
    }
  }
}

function validateStamp(value: unknown, path: string, timeZone: string, errors: string[]): void {
  if (value === null || value === undefined) return
  if (typeof value !== 'string' || instantForDateTime(value, timeZone) === null) {
    errors.push(`${path} is not a valid instant`)
  }
}

function validatePoint(point: unknown, path: string, errors: string[]): void {
  if (!isRecord(point)) {
    errors.push(`${path} is required`)
    return
  }
  if (typeof point.location !== 'string' || point.location.trim() === '') errors.push(`${path}.location is required`)
  if (!isValidDate(point.localDate)) errors.push(`${path}.localDate is invalid`)
  if (point.localTime !== null && !isValidClock(point.localTime)) errors.push(`${path}.localTime is invalid`)
  if (!isValidTimeZone(point.timeZone)) errors.push(`${path}.timeZone is invalid`)
  if (isValidDate(point.localDate) && isValidClock(point.localTime) && isValidTimeZone(point.timeZone)) {
    if (instantForLocalDateTime(point.localDate, point.localTime, point.timeZone) === null) {
      errors.push(`${path} local time is nonexistent or ambiguous`)
    }
  }
}

function validateStatus(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== 'string' || !JOURNEY_STATUSES.includes(value as JourneyStatus)) errors.push(`${path} status is invalid`)
}

function validateIdList(value: unknown, path: string, memberIds: Set<string>, errors: string[]): void {
  if (!Array.isArray(value) || value.some(id => typeof id !== 'string') || hasDuplicateIds(value as string[]) || value.some(id => !memberIds.has(id))) {
    errors.push(`${path} contains an unknown or duplicate participant`)
  }
}

function validatePhotoSpots(value: unknown, path: string, errors: string[]): void {
  if (value === undefined) return
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`)
    return
  }
  const ids = new Set<string>()
  value.forEach((spot, index) => {
    const spotPath = `${path}[${index}]`
    if (!isRecord(spot)) {
      errors.push(`${spotPath} is required`)
      return
    }
    if (typeof spot.id !== 'string' || spot.id.trim() === '') errors.push(`${spotPath}.id is required`)
    else if (ids.has(spot.id)) errors.push(`${spotPath}.id is duplicated`)
    else ids.add(spot.id)
    if (typeof spot.title !== 'string' || spot.title.trim() === '') errors.push(`${spotPath}.title is required`)
    if (!PHOTO_SPOT_DEVICES.includes(spot.device as PhotoSpotDevice)) errors.push(`${spotPath}.device is invalid`)
    if (typeof spot.composition !== 'string' || spot.composition.trim() === '') errors.push(`${spotPath}.composition is required`)
    if (spot.suggestedTime !== undefined && spot.suggestedTime !== null && typeof spot.suggestedTime !== 'string') errors.push(`${spotPath}.suggestedTime is invalid`)
    for (const coordinate of ['latitude', 'longitude'] as const) {
      const value = spot[coordinate]
      if (value !== undefined && value !== null && (typeof value !== 'number' || !Number.isFinite(value))) errors.push(`${spotPath}.${coordinate} is invalid`)
    }
    if (typeof spot.latitude === 'number' && (spot.latitude < -90 || spot.latitude > 90)) errors.push(`${spotPath}.latitude is out of range`)
    if (typeof spot.longitude === 'number' && (spot.longitude < -180 || spot.longitude > 180)) errors.push(`${spotPath}.longitude is out of range`)
    if (spot.safetyNote !== undefined && spot.safetyNote !== null && typeof spot.safetyNote !== 'string') errors.push(`${spotPath}.safetyNote is invalid`)
    if (typeof spot.sourceLabel !== 'string' || spot.sourceLabel.trim() === '') errors.push(`${spotPath}.sourceLabel is required`)
  })
}

export function validateJourney(value: unknown): JourneyValidationResult {
  const errors: string[] = []
  if (!isRecord(value)) return { valid: false, errors: ['journey must be an object'] }
  const journey = value as Partial<TripJourney>
  if (typeof journey.tripId !== 'string' || journey.tripId.trim() === '') errors.push('tripId is required')
  if (!isValidTimeZone(journey.timeZone)) errors.push('timeZone is invalid')
  const timeZone = typeof journey.timeZone === 'string' && isValidTimeZone(journey.timeZone) ? journey.timeZone : 'UTC'

  if (!Array.isArray(journey.members) || journey.members.length === 0) {
    errors.push('members must contain at least one member')
  }
  const members = Array.isArray(journey.members) ? journey.members : []
  const memberIds = new Set<string>()
  members.forEach((member, index) => {
    const path = `members[${index}]`
    if (!isRecord(member)) {
      errors.push(`${path} is required`)
      return
    }
    if (typeof member.id !== 'string' || member.id.trim() === '') errors.push(`${path}.id is required`)
    else if (memberIds.has(member.id)) errors.push(`${path}.id is duplicated`)
    else memberIds.add(member.id)
    if (member.tripId !== journey.tripId) errors.push(`${path}.tripId does not match journey.tripId`)
    if (member.displayName !== null && (typeof member.displayName !== 'string' || member.displayName.trim() === '')) errors.push(`${path}.displayName must be text or null`)
    if (member.accountId !== null) errors.push(`${path}.accountId must remain null until verified`)
  })

  const groups = Array.isArray(journey.groups) ? journey.groups : []
  if (!Array.isArray(journey.groups)) errors.push('groups must be an array')
  const groupIds = new Set<string>()
  groups.forEach((group, index) => {
    const path = `groups[${index}]`
    if (!isRecord(group)) {
      errors.push(`${path} is required`)
      return
    }
    if (typeof group.id !== 'string' || group.id.trim() === '') errors.push(`${path}.id is required`)
    else if (groupIds.has(group.id)) errors.push(`${path}.id is duplicated`)
    else groupIds.add(group.id)
    if (group.tripId !== journey.tripId) errors.push(`${path}.tripId does not match journey.tripId`)
    if (typeof group.name !== 'string' || group.name.trim() === '') errors.push(`${path}.name is required`)
    validateIdList(group.memberIds, `${path}.memberIds`, memberIds, errors)
    if (typeof group.membershipConfirmed !== 'boolean') errors.push(`${path}.membershipConfirmed is required`)
  })

  const itemIds = new Set<string>()
  const items = Array.isArray(journey.items) ? journey.items : []
  if (!Array.isArray(journey.items)) errors.push('items must be an array')
  items.forEach((item, index) => {
    const path = `items[${index}]`
    if (!isRecord(item)) {
      errors.push(`${path} is required`)
      return
    }
    if (typeof item.id !== 'string' || item.id.trim() === '') errors.push(`${path}.id is required`)
    else if (itemIds.has(item.id)) errors.push(`${path}.id is duplicated`)
    else itemIds.add(item.id)
    if (item.tripId !== undefined && item.tripId !== journey.tripId) errors.push(`${path}.tripId does not match journey.tripId`)
    if (!isValidDate(item.date)) errors.push(`${path}.date is invalid`)
    if (typeof item.name !== 'string' || item.name.trim() === '') errors.push(`${path}.name is required`)
    if (item.reminder !== undefined && item.reminder !== null && (typeof item.reminder !== 'string' || item.reminder.length > 2000)) errors.push(`${path}.reminder must be text up to 2000 characters`)
    if (typeof item.order !== 'number' || !Number.isInteger(item.order) || item.order < 0) errors.push(`${path}.order is invalid`)
    validateStatus(item.status, path, errors)
    validateParticipation(item.participation, memberIds, `${path}.participation`, errors)
    validatePhotoSpots(item.photoSpots, `${path}.photoSpots`, errors)
    for (const field of ['plannedStart', 'plannedEnd', 'actualStart', 'actualEnd'] as const) {
      const fieldValue = item[field]
      if (fieldValue !== null && fieldValue !== undefined && typeof fieldValue !== 'string') errors.push(`${path}.${field} is invalid`)
      else if (fieldValue) validateStamp(fieldValue, `${path}.${field}`, timeZone, errors)
    }
  })

  if (journey.dayPlans !== undefined) {
    if (!isRecord(journey.dayPlans)) {
      errors.push('dayPlans must be an object')
    } else {
      Object.entries(journey.dayPlans).forEach(([date, plan]) => {
        const path = `dayPlans.${date}`
        if (!isValidDate(date)) errors.push(`${path} uses an invalid date`)
        if (!isRecord(plan)) {
          errors.push(`${path} must be an object`)
          return
        }
        for (const field of ['keep', 'skip'] as const) {
          if (typeof plan[field] !== 'string' || plan[field].length > 2000) errors.push(`${path}.${field} must be text up to 2000 characters`)
        }
      })
    }
  }

  if (journey.memos !== undefined) {
    if (!isRecord(journey.memos)) {
      errors.push('memos must be an object')
    } else {
      Object.entries(journey.memos).forEach(([activityId, memo]) => {
        const path = `memos.${activityId}`
        if (!itemIds.has(activityId)) errors.push(`${path} references an unknown activity`)
        if (!isRecord(memo)) {
          errors.push(`${path} must be an object`)
          return
        }
        if (typeof memo.content !== 'string' || memo.content.length > 2000) errors.push(`${path}.content must be text up to 2000 characters`)
        if (memo.updatedBy !== null && (typeof memo.updatedBy !== 'string' || memo.updatedBy.trim() === '')) errors.push(`${path}.updatedBy must be text or null`)
        if (memo.updatedAt !== null && (typeof memo.updatedAt !== 'string' || instantForDateTime(memo.updatedAt, timeZone) === null)) errors.push(`${path}.updatedAt must be a valid instant or null`)
      })
    }
  }

  const transportIds = new Set<string>()
  const transports = Array.isArray(journey.transports) ? journey.transports : []
  if (!Array.isArray(journey.transports)) errors.push('transports must be an array')
  transports.forEach((transport, index) => {
    const path = `transports[${index}]`
    if (!isRecord(transport)) {
      errors.push(`${path} is required`)
      return
    }
    if (typeof transport.id !== 'string' || transport.id.trim() === '') errors.push(`${path}.id is required`)
    else if (transportIds.has(transport.id)) errors.push(`${path}.id is duplicated`)
    else transportIds.add(transport.id)
    if (transport.tripId !== journey.tripId) errors.push(`${path}.tripId does not match journey.tripId`)
    if (typeof transport.kind !== 'string' || !TRANSPORT_KINDS.includes(transport.kind as TransportKind)) errors.push(`${path}.kind is invalid`)
    if (typeof transport.name !== 'string' || transport.name.trim() === '') errors.push(`${path}.name is required`)
    validatePoint(transport.departure, `${path}.departure`, errors)
    validatePoint(transport.arrival, `${path}.arrival`, errors)
    validateIdList(transport.participantIds, `${path}.participantIds`, memberIds, errors)
    validateStatus(transport.status, path, errors)
    validateStamp(transport.actualStart, `${path}.actualStart`, timeZone, errors)
    validateStamp(transport.actualEnd, `${path}.actualEnd`, timeZone, errors)
    if (isRecord(transport.departure) && isRecord(transport.arrival) &&
      isValidDate(transport.departure.localDate) && isValidClock(transport.departure.localTime) && isValidTimeZone(transport.departure.timeZone) &&
      isValidDate(transport.arrival.localDate) && isValidClock(transport.arrival.localTime) && isValidTimeZone(transport.arrival.timeZone)) {
      const departureInstant = instantForLocalDateTime(transport.departure.localDate, transport.departure.localTime, transport.departure.timeZone)
      const arrivalInstant = instantForLocalDateTime(transport.arrival.localDate, transport.arrival.localTime, transport.arrival.timeZone)
      if (departureInstant !== null && arrivalInstant !== null && arrivalInstant < departureInstant) errors.push(`${path} arrival precedes departure`)
    }
  })

  const accommodationIds = new Set<string>()
  const accommodations = Array.isArray(journey.accommodations) ? journey.accommodations : []
  if (!Array.isArray(journey.accommodations)) errors.push('accommodations must be an array')
  accommodations.forEach((accommodation, index) => {
    const path = `accommodations[${index}]`
    if (!isRecord(accommodation)) {
      errors.push(`${path} is required`)
      return
    }
    if (typeof accommodation.id !== 'string' || accommodation.id.trim() === '') errors.push(`${path}.id is required`)
    else if (accommodationIds.has(accommodation.id)) errors.push(`${path}.id is duplicated`)
    else accommodationIds.add(accommodation.id)
    if (accommodation.tripId !== journey.tripId) errors.push(`${path}.tripId does not match journey.tripId`)
    if (typeof accommodation.name !== 'string' || accommodation.name.trim() === '') errors.push(`${path}.name is required`)
    if (!isValidDate(accommodation.checkIn) || !isValidDate(accommodation.checkOut)) errors.push(`${path} dates are invalid`)
    else if (accommodation.checkOut <= accommodation.checkIn) errors.push(`${path}.checkOut must be after checkIn`)
    validateIdList(accommodation.participantIds, `${path}.participantIds`, memberIds, errors)
    if (!Array.isArray(accommodation.rooms)) errors.push(`${path}.rooms must be an array`)
    else {
      const roomIds = new Set<string>()
      accommodation.rooms.forEach((room, roomIndex) => {
        const roomPath = `${path}.rooms[${roomIndex}]`
        if (!isRecord(room)) {
          errors.push(`${roomPath} is required`)
          return
        }
        if (typeof room.id !== 'string' || room.id.trim() === '') errors.push(`${roomPath}.id is required`)
        else if (roomIds.has(room.id)) errors.push(`${roomPath}.id is duplicated`)
        else roomIds.add(room.id)
        if (typeof room.name !== 'string' || room.name.trim() === '') errors.push(`${roomPath}.name is required`)
        const roomParticipantIds = Array.isArray(room.participantIds)
          ? room.participantIds
          : Array.isArray(room.memberIds)
            ? room.memberIds
            : room.occupantIds
        validateIdList(roomParticipantIds, `${roomPath}.participantIds`, memberIds, errors)
        if (Array.isArray(roomParticipantIds) && Array.isArray(accommodation.participantIds)) {
          const accommodationParticipants = new Set(accommodation.participantIds)
          if (roomParticipantIds.some(id => !accommodationParticipants.has(id))) errors.push(`${roomPath}.participantIds must be a subset of accommodation participants`)
        }
      })
    }
    if (!Array.isArray(accommodation.benefits) || accommodation.benefits.some(benefit => typeof benefit !== 'string')) errors.push(`${path}.benefits must be text values`)
  })

  return { valid: errors.length === 0, errors }
}

export function photoSpotsForItem(item: JourneyItem): PhotoSpot[] {
  return (item.photoSpots ?? []).map(spot => ({ ...spot }))
}

export function assertValidJourney(journey: unknown): asserts journey is TripJourney {
  const result = validateJourney(journey)
  if (!result.valid) throw new Error(`Invalid journey: ${result.errors.join('; ')}`)
}

export function buildDailyTimeline(journey: TripJourney): DailyTimeline[] {
  const events: TimelineEvent[] = []
  const dateKeys = new Set<string>()
  let sourceOrder = 0

  journey.items.forEach(item => {
    const sortAt = item.plannedStart
      ? instantForDateTime(item.plannedStart, journey.timeZone, item.date)
      : null
    events.push({
      id: item.id,
      date: item.date,
      name: item.name,
      type: 'item',
      sortAt,
      sourceOrder: sourceOrder++,
      location: item.location,
      participation: item.participation ?? 'all',
      item,
    })
    dateKeys.add(item.date)
  })

  journey.transports.forEach(transport => {
    const departure = transport.departure
    const arrival = transport.arrival
    const departureInstant = departure.localTime
      ? instantForLocalDateTime(departure.localDate, departure.localTime, departure.timeZone)
      : null
    const arrivalInstant = arrival.localTime
      ? instantForLocalDateTime(arrival.localDate, arrival.localTime, arrival.timeZone)
      : null
    const departureDate = dateAtInstant(departureInstant, journey.timeZone, departure.localDate)
    const arrivalDate = dateAtInstant(arrivalInstant, journey.timeZone, arrival.localDate)
    const pendingParticipation = transport.participantIds.length === 0
    events.push({
      id: transport.id,
      date: departureDate,
      name: transport.name,
      type: 'transport',
      sortAt: departureInstant ?? arrivalInstant,
      sourceOrder: sourceOrder++,
      location: `${departure.location} → ${arrival.location}`,
      transportPhase: 'departure',
      pendingParticipation,
      transport,
    })
    dateKeys.add(departureDate)
    dateKeys.add(arrivalDate)

    if (arrivalDate !== departureDate) {
      events.push({
        id: `${transport.id}:arrival`,
        date: arrivalDate,
        name: `${transport.name}（抵達）`,
        type: 'transport',
        sortAt: arrivalInstant,
        sourceOrder: sourceOrder++,
        location: arrival.location,
        transportPhase: 'arrival',
        pendingParticipation,
        transport,
      })
    }
  })

  journey.accommodations.forEach(accommodation => {
    events.push({
      id: accommodation.id,
      date: accommodation.checkIn,
      name: accommodation.name,
      type: 'accommodation',
      sortAt: null,
      sourceOrder: sourceOrder++,
      pendingParticipation: accommodation.participantIds.length === 0,
      accommodation,
    })
    dateKeys.add(accommodation.checkIn)
    dateKeys.add(accommodation.checkOut)
  })

  const sortedDates = [...dateKeys].filter(isValidDate).sort()
  if (sortedDates.length > 1) {
    const first = new Date(`${sortedDates[0]}T00:00:00Z`)
    const last = new Date(`${sortedDates[sortedDates.length - 1]}T00:00:00Z`)
    for (let current = first; current <= last; current = new Date(current.getTime() + 86_400_000)) {
      dateKeys.add(current.toISOString().slice(0, 10))
    }
  }

  return [...dateKeys]
    .filter(isValidDate)
    .sort()
    .map(date => ({
      date,
      events: events
        .filter(event => event.date === date)
        .sort((left, right) => {
          if (left.sortAt !== null && right.sortAt !== null && left.sortAt !== right.sortAt) return left.sortAt - right.sortAt
          if (left.sortAt !== null && right.sortAt === null) return -1
          if (left.sortAt === null && right.sortAt !== null) return 1
          return left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id)
        }),
    }))
}

function participationIdsFor(value: JourneyParticipation | undefined): {
  mode: 'all' | 'include' | 'exclude'
  ids: string[]
} {
  if (value === undefined || value === 'all') return { mode: 'all', ids: [] }
  if (Array.isArray(value)) return { mode: 'include', ids: value }
  const mode = value.mode ?? (value.excludedMemberIds ? 'exclude' : 'include')
  const ids = value.memberIds ?? value.participantIds ?? value.includedMemberIds ?? value.excludedMemberIds ?? []
  return { mode, ids }
}

export function participationIncludes(
  participation: JourneyParticipation | undefined,
  memberId: string,
): boolean {
  const { mode, ids } = participationIdsFor(participation)
  if (mode === 'all') return true
  return mode === 'exclude' ? !ids.includes(memberId) : ids.includes(memberId)
}

export function timelineForParticipant(journey: TripJourney, memberId: string): DailyTimeline[] {
  return buildDailyTimeline(journey)
    .map(day => ({
      ...day,
      events: day.events.filter(event => {
        if (event.type === 'item') return participationIncludes(event.participation, memberId)
        if (event.type === 'transport') return event.transport?.participantIds.length === 0 || event.transport?.participantIds.includes(memberId)
        return event.accommodation?.participantIds.length === 0 || event.accommodation?.participantIds.includes(memberId)
      }),
    }))
    .filter(day => day.events.length > 0)
}

export function accommodationFor(journey: TripJourney, memberId: string, date: string): JourneyAccommodation[] {
  if (!isValidDate(date)) return []
  return journey.accommodations.filter(accommodation =>
    (accommodation.participantIds.length === 0 || accommodation.participantIds.includes(memberId)) &&
    accommodation.checkIn <= date && date < accommodation.checkOut,
  )
}

export function withTripId(journey: TripJourney, tripId: string): TripJourney {
  const copy = cloneJourney(journey)
  copy.tripId = tripId
  copy.members = copy.members.map(member => ({ ...member, tripId }))
  copy.groups = copy.groups.map(group => ({ ...group, tripId }))
  copy.items = copy.items.map(item => ({ ...item, ...(item.tripId === undefined ? {} : { tripId }) }))
  copy.transports = copy.transports.map(transport => ({ ...transport, tripId }))
  copy.accommodations = copy.accommodations.map(accommodation => ({ ...accommodation, tripId }))
  return copy
}

export function cloneJourney(journey: TripJourney): TripJourney {
  return JSON.parse(JSON.stringify(journey)) as TripJourney
}

export function journeyStorageKey(accountId: string, tripId: string): string {
  return `${JOURNEY_LOCAL_KEY_PREFIX}:${encodeURIComponent(accountId)}:${encodeURIComponent(tripId)}`
}

function defaultStorage(): JourneyStorage | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return null
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function loadLocalJourney(accountId: string, tripId: string, storage: JourneyStorage | null = defaultStorage()): TripJourney | null {
  if (!storage) return null
  const raw = storage.getItem(journeyStorageKey(accountId, tripId))
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = validateJourney(parsed)
    return result.valid ? cloneJourney(parsed as TripJourney) : null
  } catch {
    return null
  }
}

export function saveLocalJourney(accountId: string, journey: TripJourney, storage: JourneyStorage | null = defaultStorage()): void {
  if (!storage) throw new Error('此裝置不支援本機儲存')
  assertValidJourney(journey)
  storage.setItem(journeyStorageKey(accountId, journey.tripId), JSON.stringify(journey))
}
