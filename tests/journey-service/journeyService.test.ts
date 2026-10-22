import { describe, expect, it, vi } from 'vitest'

import {
  JOURNEY_CONFLICT,
  JourneyServiceError,
  createJourneyService,
  journeyService,
  type JourneyEnvelope,
} from '@/services/journeyService'
import { supabaseConfigured } from '@/services/supabase'

const envelope: JourneyEnvelope = {
  tripId: '8c2cc9bd-236c-4a3b-a8b7-8e4a3b28ea76',
  revision: 1,
  journey: {
    tripId: '8c2cc9bd-236c-4a3b-a8b7-8e4a3b28ea76',
    timeZone: 'Atlantic/Reykjavik',
    members: [],
    groups: [],
    items: [],
    transports: [],
    accommodations: [],
  },
  canEdit: true,
  updatedAt: '2026-10-13T12:00:00.000Z',
}

describe('journeyService RPC adapter', () => {
  it('keeps a public build importable and fails cloud calls lazily without env', async () => {
    if (supabaseConfigured) return

    await expect(journeyService.loadJourney(envelope.tripId)).rejects.toMatchObject({
      code: 'SUPABASE_NOT_CONFIGURED',
      status: 503,
    })
  })

  it.each([true, false])('uses the existing fixed membership rule: canRead=%s', async canRead => {
    const rpc = vi.fn().mockResolvedValue({ data: canRead, error: null })
    const service = createJourneyService({ rpc })
    await expect(service.canReadJourney(envelope.tripId)).resolves.toBe(canRead)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('tripbook_can_read', { p_trip_id: envelope.tripId })
  })

  it('does not turn a failed or malformed membership response into nonmembership', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' } })
      .mockResolvedValueOnce({ data: null, error: null })
    const service = createJourneyService({ rpc })
    await expect(service.canReadJourney(envelope.tripId)).rejects.toMatchObject({ code: 'JOURNEY_REQUEST_FAILED' })
    await expect(service.canReadJourney(envelope.tripId)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })

  it('creates a journey with the exact RPC envelope and keeps the server trip ID', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: envelope, error: null })
    const service = createJourneyService({ rpc })

    const result = await service.createJourney(envelope.journey)

    expect(rpc).toHaveBeenCalledWith('tripbook_create_journey', {
      p_journey: envelope.journey,
    })
    expect(result).toEqual(envelope)
  })

  it('resolves the Iceland preview alias to one accessible cloud UUID before loading', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: envelope, error: null })
    const select = vi.fn().mockResolvedValue({ data: [
      { trip_id: 'b7b0f3a7-68a9-4d44-a7f1-1e53e70c0a99', journey: { timeZone: 'Europe/London', items: [{ date: '2026-10-28' }] } },
      { trip_id: envelope.tripId, journey: { timeZone: 'Atlantic/Reykjavik', items: [{ date: '2026-11-02' }] } },
    ], error: null })
    const from = vi.fn().mockReturnValue({ select })
    const service = createJourneyService({ rpc, from })

    await expect(service.loadJourney('tripbook-iceland-2026')).resolves.toEqual(envelope)
    expect(from).toHaveBeenCalledWith('tripbook_journeys')
    expect(select).toHaveBeenCalledWith('trip_id,journey')
    expect(rpc).toHaveBeenCalledWith('tripbook_load_journey', { p_trip_id: envelope.tripId })
  })

  it('does not send a non-UUID trip ID to the database when no matching journey exists', async () => {
    const rpc = vi.fn()
    const from = vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: null }) })
    const service = createJourneyService({ rpc, from })

    await expect(service.loadJourney('tripbook-iceland-2026')).rejects.toMatchObject({ code: 'JOURNEY_NOT_FOUND', status: 404 })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('does not guess which of multiple accessible Iceland journeys to open', async () => {
    const rpc = vi.fn()
    const otherId = 'b7b0f3a7-68a9-4d44-a7f1-1e53e70c0a99'
    const journey = { timeZone: 'Atlantic/Reykjavik', items: [{ date: '2026-11-02' }] }
    const from = vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [
      { trip_id: envelope.tripId, journey }, { trip_id: otherId, journey },
    ], error: null }) })
    const service = createJourneyService({ rpc, from })

    await expect(service.loadJourney('tripbook-iceland-2026')).rejects.toMatchObject({ code: 'AMBIGUOUS_JOURNEY', status: 409 })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects a coherent response for a different requested Trip ID without mutating the draft', async () => {
    const otherTripId = 'b7b0f3a7-68a9-4d44-a7f1-1e53e70c0a99'
    const otherTripEnvelope: JourneyEnvelope = {
      ...envelope,
      tripId: otherTripId,
      journey: { ...envelope.journey, tripId: otherTripId },
    }
    const rpc = vi.fn().mockResolvedValue({ data: otherTripEnvelope, error: null })
    const service = createJourneyService({ rpc })
    const draft = structuredClone(envelope.journey)
    const originalDraft = structuredClone(draft)

    await expect(service.loadJourney(envelope.tripId)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 502,
    })
    await expect(service.saveJourney(envelope.tripId, envelope.revision, draft)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 502,
    })
    expect(draft).toEqual(originalDraft)
  })

  it('maps a stale compare-and-swap response to a conflict without changing the draft', async () => {
    const draft = structuredClone(envelope.journey)
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'journey_conflict', details: 'expected revision is stale' },
    })
    const service = createJourneyService({ rpc })

    await expect(service.saveJourney(envelope.tripId, envelope.revision, draft)).rejects.toMatchObject({
      code: JOURNEY_CONFLICT,
      status: 409,
    })
    expect(draft).toEqual(envelope.journey)
  })

  it('preserves the original RPC error details for non-conflict failures', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'journey_read_only', hint: 'organizer role required' },
    })
    const service = createJourneyService({ rpc })

    try {
      await service.saveJourney(envelope.tripId, envelope.revision, envelope.journey)
      throw new Error('expected save to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(JourneyServiceError)
      expect(error).toMatchObject({ code: 'JOURNEY_READ_ONLY', status: 403, message: 'journey_read_only' })
      expect((error as JourneyServiceError).details).toMatchObject({ hint: 'organizer role required' })
    }
  })

  it('saves one shared memo through the revision guarded RPC without trusting actor metadata', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: envelope, error: null })
    const service = createJourneyService({ rpc })

    await expect(service.saveMemo(envelope.tripId, envelope.revision, 'iceland-stop-1', '抵達後確認採買清單')).resolves.toEqual(envelope)
    expect(rpc).toHaveBeenCalledWith('tripbook_save_journey_memo', {
      p_trip_id: envelope.tripId,
      p_expected_revision: envelope.revision,
      p_activity_id: 'iceland-stop-1',
      p_content: '抵達後確認採買清單',
    })
    expect(JSON.stringify(rpc.mock.calls[0][1])).not.toContain('updatedBy')
    expect(JSON.stringify(rpc.mock.calls[0][1])).not.toContain('updatedAt')
  })

  it('maps stale memo writes to the same journey conflict used by full saves', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'journey_conflict', details: 'expected revision is stale' },
    })
    const service = createJourneyService({ rpc })

    await expect(service.saveMemo(envelope.tripId, envelope.revision, 'iceland-stop-1', 'draft')).rejects.toMatchObject({
      code: JOURNEY_CONFLICT,
      status: 409,
    })
  })

})
