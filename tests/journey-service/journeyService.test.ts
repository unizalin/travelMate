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

  it('creates a journey with the exact RPC envelope and keeps the server trip ID', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: envelope, error: null })
    const service = createJourneyService({ rpc })

    const result = await service.createJourney(envelope.journey)

    expect(rpc).toHaveBeenCalledWith('tripbook_create_journey', {
      p_journey: envelope.journey,
    })
    expect(result).toEqual(envelope)
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

  it('grants private journey access through the owner RPC', async () => {
    const grant = {
      tripId: envelope.tripId,
      userId: 'c7d2c4c6-03e4-4b8f-bab2-b4a1b5e3e4d8',
      role: 'member' as const,
    }
    const rpc = vi.fn().mockResolvedValue({ data: grant, error: null })
    const service = createJourneyService({ rpc })

    await expect(service.grantJourneyAccess(grant.tripId, grant.userId, grant.role)).resolves.toEqual(grant)
    expect(rpc).toHaveBeenCalledWith('tripbook_grant_journey_access', {
      p_trip_id: grant.tripId,
      p_user_id: grant.userId,
      p_role: grant.role,
    })
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

  it('maps an owner-only access failure without exposing the access table', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'journey_forbidden', details: 'owner grant required' },
    })
    const service = createJourneyService({ rpc })

    await expect(
      service.grantJourneyAccess(envelope.tripId, 'c7d2c4c6-03e4-4b8f-bab2-b4a1b5e3e4d8', 'editor'),
    ).rejects.toMatchObject({ code: 'JOURNEY_FORBIDDEN', status: 403 })
  })
})
