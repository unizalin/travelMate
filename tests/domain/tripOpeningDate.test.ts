import { describe, expect, it } from 'vitest'
import { tripOpeningDate } from '@/domain/tripOpeningDate'

const dates = ['2026-10-24', '2026-10-25', '2026-10-30', '2026-11-03', '2026-11-07']

describe('trip opening date', () => {
  it('opens the local trip date and clamps days outside the trip range', () => {
    expect(tripOpeningDate(dates, new Date('2026-10-21T12:00:00Z'))).toBe('2026-10-24')
    expect(tripOpeningDate(dates, new Date('2026-10-24T23:30:00Z'))).toBe('2026-10-25')
    expect(tripOpeningDate(dates, new Date('2026-11-03T12:00:00Z'))).toBe('2026-11-03')
    expect(tripOpeningDate(dates, new Date('2026-11-08T12:00:00Z'))).toBe('2026-11-07')
  })

  it('selects the next available day if the itinerary has a gap', () => {
    expect(tripOpeningDate(dates, new Date('2026-11-02T12:00:00Z'))).toBe('2026-11-03')
    expect(tripOpeningDate([])).toBe('')
  })
})
