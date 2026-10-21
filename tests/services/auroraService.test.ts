import { describe, expect, it } from 'vitest'
import { AuroraConditionsService, loadAuroraConditions } from '@/services/auroraService'

const now = new Date('2026-10-14T20:00:00Z')

const openMeteoPayload = {
  hourly: {
    time: ['2026-10-14T21:00', '2026-10-15T00:00', '2026-10-15T21:00', '2026-10-16T21:00'],
    cloud_cover: [20, 25, 35, 15],
    is_day: [0, 0, 0, 0],
  },
  daily: {
    sunrise: ['2026-10-14T08:00', '2026-10-15T08:00', '2026-10-16T08:00', '2026-10-17T08:00'],
    sunset: ['2026-10-14T18:00', '2026-10-15T18:00', '2026-10-16T18:00', '2026-10-17T18:00'],
  },
}

const noaaPayload = [
  { time_tag: '2026-10-14T21:00', kp: 4, observed: 'predicted' },
  { time_tag: '2026-10-15T21:00', kp: 3, observed: 'predicted' },
  { time_tag: '2026-10-16T21:00', kp: 5, observed: 'predicted' },
  { time_tag: '2026-10-14T18:00', kp: 9, observed: 'observed' },
]

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

describe('aurora service', () => {
  it('combines same-night Open-Meteo hours with NOAA forecast slots', async () => {
    const result = await loadAuroraConditions('reykjavik', {
      now,
      fetchImpl: async url => url.includes('open-meteo') ? response(openMeteoPayload) : response(noaaPayload),
    })

    expect(result.localDate).toBe('2026-10-14')
    expect(result.hours).toEqual([
      { time: '2026-10-14T21:00', cloudCover: 20, kp: 4 },
      { time: '2026-10-15T00:00', cloudCover: 25, kp: null },
    ])
    expect(result.assessment.label).toBe('資料不足')
    expect(result.outlook).toEqual([
      expect.objectContaining({ localDate: '2026-10-15', kp: 3, cloudCover: 35 }),
      expect.objectContaining({ localDate: '2026-10-16', kp: 5, cloudCover: 15 }),
    ])
    expect(result.errors).toEqual([])
  })

  it('clears the composite assessment when NOAA fails instead of reusing old success', async () => {
    const result = await loadAuroraConditions('reykjavik', {
      now,
      fetchImpl: async url => {
        if (url.includes('noaa')) throw new Error('NOAA unavailable')
        return response(openMeteoPayload)
      },
    })

    expect(result.assessment.label).toBe('資料不足')
    expect(result.errors).toEqual(['NOAA unavailable'])
  })

  it('reports insufficient data when all hourly forecast times are expired', async () => {
    const result = await loadAuroraConditions('reykjavik', {
      now,
      fetchImpl: async url => url.includes('open-meteo')
        ? response({ ...openMeteoPayload, hourly: { ...openMeteoPayload.hourly, time: ['2026-10-14T18:00'], cloud_cover: [10], is_day: [0] } })
        : response(noaaPayload),
    })

    expect(result.hours).toEqual([])
    expect(result.assessment.label).toBe('資料不足')
  })

  it('does not borrow another date when today sunset is missing', async () => {
    const result = await loadAuroraConditions('reykjavik', {
      now,
      fetchImpl: async url => url.includes('open-meteo')
        ? response({ ...openMeteoPayload, daily: { sunset: ['2026-10-13T18:00'], sunrise: ['2026-10-15T08:00'] } })
        : response(noaaPayload),
    })

    expect(result.sunset).toBeNull()
    expect(result.sunrise).toBeNull()
    expect(result.hours).toEqual([])
    expect(result.assessment.label).toBe('資料不足')
  })

  it('cancels the previous city request when a newer city is requested', async () => {
    const service = new AuroraConditionsService()
    let calls = 0
    const fetchImpl = (url: string, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
      calls += 1
      const timer = setTimeout(() => resolve(response(url.includes('open-meteo') ? openMeteoPayload : noaaPayload)), 30)
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('aborted', 'AbortError'))
      })
    })

    const first = service.load('reykjavik', { now, fetchImpl }).catch(error => error.name)
    const second = service.load('vik', { now, fetchImpl })
    await expect(first).resolves.toBe('AbortError')
    await expect(second).resolves.toMatchObject({ city: { id: 'vik' } })
    expect(calls).toBe(4)
  })

  it('rejects immediately when the caller signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(loadAuroraConditions('reykjavik', { now, signal: controller.signal, fetchImpl: async () => response(openMeteoPayload) })).rejects.toMatchObject({ name: 'AbortError' })
  })
})
