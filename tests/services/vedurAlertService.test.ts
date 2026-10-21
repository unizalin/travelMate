import { describe, expect, it } from 'vitest'
import { loadVedurAlerts, parseVedurAlerts } from '@/services/vedurAlertService'

const now = new Date('2026-11-02T12:00:00Z')
function capAlert(color: string, onset: string, expires: string, region = 'South Iceland') {
  return {
    sent: '2026-11-02T08:00:00Z',
    info: [{
      language: 'en-US',
      headline: `${color} wind and rain`,
      onset,
      expires,
      parameter: [{ valueName: 'Color', value: color }],
      area: [{ areaDesc: region, geocode: [{ valueName: 'Forecast Region', value: region }] }],
    }],
  }
}
function feed(alerts: unknown[]) {
  return { now: now.toISOString(), alert: { key: 'source-key', data: { updateTS: now.toISOString(), alerts } } }
}

describe('Veður official alert feed', () => {
  it('shows only a currently valid yellow warning, not an expired or green notice', () => {
    const alerts = parseVedurAlerts(feed([
      capAlert('yellow', '2026-11-02T10:00:00Z', '2026-11-02T14:00:00Z'),
      capAlert('orange', '2026-11-02T08:00:00Z', '2026-11-02T11:00:00Z'),
      capAlert('green', '2026-11-02T10:00:00Z', '2026-11-02T14:00:00Z'),
    ]), now)
    expect(alerts).toEqual([{
      level: 'yellow',
      area: 'South Iceland',
      headline: 'yellow wind and rain',
      startsAt: '2026-11-02T10:00:00.000Z',
      endsAt: '2026-11-02T14:00:00.000Z',
    }])
  })

  it('sorts severe alerts first and keeps unknown areas visible for safety', () => {
    const alerts = parseVedurAlerts(feed([
      capAlert('yellow', '2026-11-02T10:00:00Z', '2026-11-02T14:00:00Z', 'Northeast Iceland'),
      capAlert('yellow', '2026-11-02T10:00:00Z', '2026-11-02T14:00:00Z', 'New warning area'),
      capAlert('red', '2026-11-02T10:00:00Z', '2026-11-02T14:00:00Z', 'Reykjavik - Capital Region'),
      capAlert('orange', '2026-11-02T10:00:00Z', '2026-11-02T14:00:00Z', 'East Iceland'),
    ]), now)
    expect(alerts?.map(alert => [alert.level, alert.area])).toEqual([
      ['red', 'Reykjavik - Capital Region'],
      ['orange', 'East Iceland'],
      ['yellow', 'New warning area'],
    ])
  })

  it('treats malformed payloads and failed requests as unavailable without old data', async () => {
    expect(parseVedurAlerts({ alert: { data: { alerts: [] } } }, now)).toBeNull()
    expect(parseVedurAlerts(feed([capAlert('yellow', 'bad', '2026-11-02T14:00:00Z')]), now)).toBeNull()
    const result = await loadVedurAlerts({ fetchImpl: async () => { throw new Error('offline') } })
    expect(result).toMatchObject({ kind: 'unavailable', alerts: [] })
  })

  it('uses the same-origin proxy and accepts an empty official response', async () => {
    let requested = ''
    let cache = ''
    const result = await loadVedurAlerts({ fetchImpl: async (url, init) => {
      requested = url
      cache = init?.cache ?? ''
      return new Response(JSON.stringify(feed([])), { status: 200 })
    } })
    expect(result).toMatchObject({ kind: 'available', alerts: [] })
    expect(requested).toBe('/api/vedur-alerts')
    expect(cache).toBe('no-store')
  })
})
