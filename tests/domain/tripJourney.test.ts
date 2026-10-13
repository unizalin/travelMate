import {
  accommodationFor,
  buildDailyTimeline,
  type TripJourney,
  timelineForParticipant,
  validateJourney,
  withTripId,
} from '@/domain/tripJourney'

const tripId = 'journey-test-trip'
const members = Array.from({ length: 6 }, (_, index) => ({
  id: `member-${index + 1}`,
  tripId,
  displayName: `成員 ${index + 1}`,
  accountId: null,
}))

const journey: TripJourney = {
  tripId,
  timeZone: 'Atlantic/Reykjavik',
  members,
  groups: [
    {
      id: 'group-a',
      tripId,
      name: '先出發',
      memberIds: ['member-1', 'member-2', 'member-3'],
      membershipConfirmed: false,
    },
    {
      id: 'group-b',
      tripId,
      name: '攝影組',
      memberIds: ['member-3', 'member-4'],
      membershipConfirmed: false,
    },
    {
      id: 'group-c',
      tripId,
      name: '晚到組',
      memberIds: ['member-5', 'member-6'],
      membershipConfirmed: false,
    },
  ],
  items: [
    {
      id: 'item-shared',
      date: '2026-10-31',
      name: 'Kirkjufellsfoss',
      location: 'Grundarfjörður',
      order: 1,
      plannedStart: null,
      plannedEnd: null,
      actualStart: null,
      actualEnd: null,
      status: 'planned',
      participation: 'all',
    },
    {
      id: 'item-subset',
      date: '2026-11-01',
      name: 'Brúarfoss',
      location: 'Bláskógabyggð',
      order: 1,
      plannedStart: '2026-11-01T08:00:00-00:00',
      plannedEnd: null,
      actualStart: null,
      actualEnd: null,
      status: 'next',
      participation: { mode: 'include', memberIds: ['member-1', 'member-3'] },
    },
  ],
  transports: [
    {
      id: 'flight-out',
      tripId,
      kind: 'flight',
      name: 'BA802',
      departure: {
        location: 'LHR',
        localDate: '2026-10-30',
        localTime: '13:50',
        timeZone: 'Europe/London',
      },
      arrival: {
        location: 'KEF',
        localDate: '2026-10-30',
        localTime: '17:15',
        timeZone: 'Atlantic/Reykjavik',
      },
      participantIds: ['member-1', 'member-2', 'member-3'],
      status: 'planned',
      actualStart: null,
      actualEnd: null,
    },
    {
      id: 'flight-home',
      tripId,
      kind: 'flight',
      name: 'BA801',
      departure: {
        location: 'KEF',
        localDate: '2026-11-07',
        localTime: '11:55',
        timeZone: 'Atlantic/Reykjavik',
      },
      arrival: {
        location: 'LHR',
        localDate: '2026-11-07',
        localTime: '15:05',
        timeZone: 'Europe/London',
      },
      participantIds: ['member-4', 'member-5', 'member-6'],
      status: 'planned',
      actualStart: null,
      actualEnd: null,
    },
  ],
  accommodations: [
    {
      id: 'stay-reykjavik',
      tripId,
      name: 'Reykjavík',
      checkIn: '2026-10-30',
      checkOut: '2026-11-01',
      participantIds: ['member-1', 'member-2', 'member-3', 'member-4'],
      rooms: [
        { id: 'room-1', name: 'Room 1', participantIds: ['member-1', 'member-4'] },
      ],
      benefits: ['早餐'],
    },
  ],
}

describe('TripJourney domain', () => {
  it('validates six unknown members, overlapping groups, shared events, and subset flights', () => {
    const result = validateJourney(journey)

    expect(result.valid).toBe(true)
    expect(journey.members).toHaveLength(6)
    expect(journey.members.every(member => member.accountId === null)).toBe(true)
    expect(journey.groups[0].memberIds).toContain('member-3')
    expect(journey.groups[1].memberIds).toContain('member-3')
    expect(journey.transports.map(transport => transport.participantIds)).toEqual([
      ['member-1', 'member-2', 'member-3'],
      ['member-4', 'member-5', 'member-6'],
    ])
  })

  it('keeps a shared item once while preserving an explicit participation exception', () => {
    const timeline = buildDailyTimeline(journey)
    const events = timeline.flatMap(day => day.events)

    expect(events.filter(event => event.id === 'item-shared')).toHaveLength(1)
    expect(events.find(event => event.id === 'item-subset')?.participation).toEqual({
      mode: 'include',
      memberIds: ['member-1', 'member-3'],
    })
  })

  it('sorts known instants by timezone while retaining an overnight arrival once', () => {
    const overnight: TripJourney = {
      ...journey,
      transports: [
        {
          ...journey.transports[0],
          id: 'overnight',
          departure: {
            ...journey.transports[0].departure,
            localDate: '2026-10-30',
            localTime: '23:30',
          },
          arrival: {
            ...journey.transports[0].arrival,
            localDate: '2026-10-31',
            localTime: '01:30',
          },
        },
      ],
    }
    const events = buildDailyTimeline(overnight)
      .flatMap(day => day.events)
      .filter(event => event.type !== 'accommodation')

    expect(events.filter(event => event.id.startsWith('overnight'))).toHaveLength(2)
    expect(events.find(event => event.id === 'overnight')?.date).toBe('2026-10-30')
    expect(events.find(event => event.id === 'overnight:arrival')?.date).toBe('2026-10-31')
    expect(events.map(event => event.id).slice(0, 3)).toEqual(['overnight', 'overnight:arrival', 'item-shared'])
  })

  it('includes accommodation on check-in and excludes it on checkout', () => {
    expect(accommodationFor(journey, 'member-1', '2026-10-30').map(stay => stay.id)).toEqual([
      'stay-reykjavik',
    ])
    expect(accommodationFor(journey, 'member-1', '2026-11-01')).toEqual([])
    expect(accommodationFor(journey, 'member-5', '2026-10-30')).toEqual([])
    const unassignedStay: TripJourney = {
      ...journey,
      accommodations: [{ ...journey.accommodations[0], id: 'stay-unassigned', participantIds: [] }],
    }
    expect(accommodationFor(unassignedStay, 'member-5', '2026-10-30').map(stay => stay.id)).toEqual(['stay-unassigned'])
  })

  it('rejects unknown participants, non-null provisional accounts, invalid times, and non-subset rooms', () => {
    const invalid: TripJourney = {
      ...journey,
      members: journey.members.map(member =>
        member.id === 'member-1' ? { ...member, accountId: 'account-not-verified' } : member,
      ),
      items: [
        {
          ...journey.items[0],
          participation: { mode: 'include', memberIds: ['missing-member'] },
        },
      ],
      transports: [
        {
          ...journey.transports[0],
          departure: { ...journey.transports[0].departure, localTime: '25:99' },
        },
      ],
      accommodations: [
        {
          ...journey.accommodations[0],
          rooms: [{ id: 'room-invalid', name: 'Room', participantIds: ['member-6'] }],
        },
      ],
    }

    const result = validateJourney(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/accountId|participant|time|room/i)
  })

  it('accepts known staging aliases so loaded participation and room assignments survive editing', () => {
    const stagingJourney = structuredClone(journey) as TripJourney & {
      accommodations: Array<TripJourney['accommodations'][number] & {
        rooms: Array<{ id: string; name: string; memberIds: string[] }>
      }>
    }
    stagingJourney.items[0].participation = { excludedMemberIds: [] }
    stagingJourney.accommodations[0].rooms = [{ id: 'room-legacy', name: 'Room', memberIds: ['member-1'] }]

    expect(validateJourney(stagingJourney).valid).toBe(true)
  })

  it('filters a derived participant view without copying the shared journey', () => {
    const filtered = timelineForParticipant(journey, 'member-6')
    const ids = filtered.flatMap(day => day.events.map(event => event.id))

    expect(ids).toContain('item-shared')
    expect(ids).not.toContain('item-subset')
    expect(ids).toContain('flight-home')
    expect(filtered).not.toBe(buildDailyTimeline(journey))
    expect(journey.items).toHaveLength(2)
  })

  it('sorts known instants before unknown-time events and converts points into the journey timezone', () => {
    const shifted: TripJourney = {
      ...journey,
      items: [{ ...journey.items[0], date: '2026-07-30', id: 'unknown-stop' }],
      accommodations: [],
      transports: [{
        ...journey.transports[0],
        id: 'early-flight',
        departure: { ...journey.transports[0].departure, localDate: '2026-07-30', localTime: '00:30' },
        arrival: { ...journey.transports[0].arrival, localDate: '2026-07-30', localTime: '02:00' },
      }],
    }
    const timeline = buildDailyTimeline(shifted)
    expect(timeline[0].date).toBe('2026-07-29')
    expect(timeline.find(day => day.date === '2026-07-30')?.events.map(event => event.id)).toEqual(['early-flight:arrival', 'unknown-stop'])
  })

  it('rebinds every nested trip id without changing unknown member data', () => {
    const rebound = withTripId(journey, 'real-trip-id')

    expect(rebound.tripId).toBe('real-trip-id')
    expect(rebound.members.every(member => member.tripId === 'real-trip-id')).toBe(true)
    expect(rebound.groups.every(group => group.tripId === 'real-trip-id')).toBe(true)
    expect(rebound.transports.every(transport => transport.tripId === 'real-trip-id')).toBe(true)
    expect(rebound.accommodations.every(stay => stay.tripId === 'real-trip-id')).toBe(true)
    expect(rebound.members.map(member => member.displayName)).toEqual(journey.members.map(member => member.displayName))
  })
})
