import { icelandFlights } from '@/data/icelandFlights'
import { taiwanFlightTime } from '@/domain/flightDisplay'
import { solarTimes } from '@/domain/solarTimes'

function minutes(value: string | null): number {
  if (value === null) return Number.NaN
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

describe('trip UI time helpers', () => {
  it('converts each known flight endpoint to Taiwan time across local time zones', () => {
    expect(taiwanFlightTime(icelandFlights.find(flight => flight.id === 'ba802')!).replace(/\s/gu, ' ')).toBe('10/30 21:50 → 10/31 01:15')
    expect(taiwanFlightTime(icelandFlights.find(flight => flight.id === 'ba801')!).replace(/\s/gu, ' ')).toBe('11/7 19:55 → 11/7 23:05')
  })

  it('returns ordered sunrise, sunset, and blue-hour boundaries for the Iceland dates', () => {
    const times = solarTimes('2026-11-01', 64.1466, -21.9426)

    expect(times).toEqual({
      sunrise: expect.stringMatching(/^\d{2}:\d{2}$/),
      sunset: expect.stringMatching(/^\d{2}:\d{2}$/),
      morning: [expect.stringMatching(/^\d{2}:\d{2}$/), expect.stringMatching(/^\d{2}:\d{2}$/)],
      evening: [expect.stringMatching(/^\d{2}:\d{2}$/), expect.stringMatching(/^\d{2}:\d{2}$/)],
    })
    expect(minutes(times.morning[0])).toBeLessThan(minutes(times.morning[1]))
    expect(minutes(times.morning[1])).toBeLessThan(minutes(times.sunrise))
    expect(minutes(times.sunset)).toBeLessThan(minutes(times.evening[0]))
    expect(minutes(times.evening[0])).toBeLessThan(minutes(times.evening[1]))
  })
})
