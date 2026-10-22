import { afterEach, describe, expect, it, vi } from 'vitest'
import { createJourneyService } from '@/services/journeyService'

const tripId = '8c2cc9bd-236c-4a3b-a8b7-8e4a3b28ea76'
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('journey configuration boundary', () => {
  it.each([tripId, `${tripId}\n`, ` \r\n${tripId} \t`])('uses a canonical UUID from environment configuration %j', async configured => {
    vi.stubEnv('VITE_ICELAND_TRIP_ID', configured)
    vi.resetModules()
    const { ICELAND_TRIP_ID } = await import('@/router/iceland')
    expect(ICELAND_TRIP_ID).toBe(tripId)
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null })
    await expect(createJourneyService({ rpc }).canReadJourney(ICELAND_TRIP_ID)).resolves.toBe(true)
    expect(rpc).toHaveBeenCalledWith('tripbook_can_read', { p_trip_id: tripId })
  })

  it.each(['', ' \n\t '])('retains the local alias when configuration is empty: %j', async configured => {
    vi.stubEnv('VITE_ICELAND_TRIP_ID', configured)
    vi.resetModules()
    const { ICELAND_TRIP_ID } = await import('@/router/iceland')
    expect(ICELAND_TRIP_ID).toBe('tripbook-iceland-2026')
  })
})
