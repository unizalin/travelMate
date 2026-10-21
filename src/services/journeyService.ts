import { supabase, supabaseConfigured } from '@/services/supabase'
import type { TripJourney } from '@/domain/tripJourney'

export interface JourneyEnvelope {
  tripId: string
  revision: number
  journey: TripJourney
  canEdit: boolean
  updatedAt: string
}

export type JourneyAccessRole = 'editor' | 'member'

export interface JourneyAccessGrant {
  tripId: string
  userId: string
  role: JourneyAccessRole
}

export const JOURNEY_CONFLICT = 'JOURNEY_CONFLICT'

export interface JourneyRpcError {
  code?: string
  message: string
  details?: unknown
  hint?: string
}

export interface JourneyRpcClient {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: JourneyRpcError | null }>
}

export class JourneyServiceError extends Error {
  readonly code: string
  readonly status: number
  readonly details: unknown

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'JourneyServiceError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function rpcError(error: JourneyRpcError): JourneyServiceError {
  const message = error.message || 'journey_request_failed'
  const normalized = message.toLowerCase()

  if (normalized.includes('journey_conflict')) {
    return new JourneyServiceError(JOURNEY_CONFLICT, message, 409, error.details ?? error)
  }
  if (normalized.includes('not_authenticated')) {
    return new JourneyServiceError('AUTHENTICATION_REQUIRED', message, 401, error.details ?? error)
  }
  if (normalized.includes('journey_not_found')) {
    return new JourneyServiceError('JOURNEY_NOT_FOUND', message, 404, error.details ?? error)
  }
  if (normalized.includes('journey_read_only')) {
    return new JourneyServiceError('JOURNEY_READ_ONLY', message, 403, error.details ?? error)
  }
  if (normalized.includes('journey_forbidden')) {
    return new JourneyServiceError('JOURNEY_FORBIDDEN', message, 403, error.details ?? error)
  }
  if (normalized.includes('invalid_access')) {
    return new JourneyServiceError('INVALID_ACCESS', message, 400, error.details ?? error)
  }
  if (normalized.includes('invalid_journey') || normalized.includes('account_binding_unavailable') || normalized.includes('invalid_revision')) {
    return new JourneyServiceError('INVALID_JOURNEY', message, 400, error.details ?? error)
  }
  if (error.code === '42501') {
    return new JourneyServiceError('JOURNEY_FORBIDDEN', message, 403, error.details ?? error)
  }

  return new JourneyServiceError(error.code || 'JOURNEY_REQUEST_FAILED', message, 500, error.details ?? error)
}

function unwrapRpcData(data: unknown): unknown {
  // PostgREST returns a scalar jsonb RPC value as an object.  Some local
  // client versions wrap a single row in an array, so accept that representation
  // without weakening the envelope checks below.
  if (Array.isArray(data) && data.length === 1) return data[0]
  return data
}

export function parseEnvelope(data: unknown): JourneyEnvelope {
  const value = unwrapRpcData(data)
  if (!value || typeof value !== 'object') {
    throw new JourneyServiceError('INVALID_RESPONSE', 'journey RPC returned no envelope', 502, value)
  }

  const record = value as Record<string, unknown>
  const revision = record.revision
  const journey = record.journey
  const journeyRecord = journey && typeof journey === 'object' ? (journey as Record<string, unknown>) : null
  if (
    typeof record.tripId !== 'string' ||
    typeof revision !== 'number' ||
    !Number.isInteger(revision) ||
    revision < 1 ||
    !journeyRecord ||
    typeof journeyRecord.tripId !== 'string' ||
    journeyRecord.tripId !== record.tripId ||
    typeof record.canEdit !== 'boolean' ||
    typeof record.updatedAt !== 'string'
  ) {
    throw new JourneyServiceError('INVALID_RESPONSE', 'journey RPC returned an invalid envelope', 502, value)
  }

  return {
    tripId: record.tripId,
    revision,
    journey: journey as TripJourney,
    canEdit: record.canEdit,
    updatedAt: record.updatedAt,
  }
}

function parseAccessGrant(data: unknown): JourneyAccessGrant {
  const value = unwrapRpcData(data)
  if (!value || typeof value !== 'object') {
    throw new JourneyServiceError('INVALID_RESPONSE', 'journey access RPC returned no grant', 502, value)
  }

  const record = value as Record<string, unknown>
  if (
    typeof record.tripId !== 'string' ||
    typeof record.userId !== 'string' ||
    (record.role !== 'editor' && record.role !== 'member')
  ) {
    throw new JourneyServiceError('INVALID_RESPONSE', 'journey access RPC returned an invalid grant', 502, value)
  }

  return {
    tripId: record.tripId,
    userId: record.userId,
    role: record.role,
  }
}

export function createJourneyService(client: JourneyRpcClient = supabase as unknown as JourneyRpcClient) {
  async function invoke(
    name: string,
    args: Record<string, unknown>,
    expectedTripId?: string,
  ): Promise<JourneyEnvelope> {
    if (client === (supabase as unknown as JourneyRpcClient) && !supabaseConfigured) {
      throw new JourneyServiceError(
        'SUPABASE_NOT_CONFIGURED',
        'Supabase is not configured for cloud journey storage',
        503,
      )
    }

    const { data, error } = await client.rpc(name, args)
    if (error) throw rpcError(error)
    const envelope = parseEnvelope(data)
    if (expectedTripId !== undefined && envelope.tripId !== expectedTripId) {
      throw new JourneyServiceError(
        'INVALID_RESPONSE',
        'journey RPC returned an unexpected Trip ID',
        502,
        { expectedTripId, receivedTripId: envelope.tripId, envelope },
      )
    }
    return envelope
  }

  return {
    createJourney(journey: TripJourney) {
      return invoke('tripbook_create_journey', { p_journey: journey })
    },

    loadJourney(tripId: string) {
      return invoke('tripbook_load_journey', { p_trip_id: tripId }, tripId)
    },

    saveJourney(tripId: string, expectedRevision: number, journey: TripJourney) {
      return invoke(
        'tripbook_save_journey',
        {
          p_trip_id: tripId,
          p_expected_revision: expectedRevision,
          p_journey: journey,
        },
        tripId,
      )
    },

    saveMemo(tripId: string, expectedRevision: number, activityId: string, content: string) {
      return invoke(
        'tripbook_save_journey_memo',
        {
          p_trip_id: tripId,
          p_expected_revision: expectedRevision,
          p_activity_id: activityId,
          p_content: content,
        },
        tripId,
      )
    },

    async grantJourneyAccess(tripId: string, userId: string, role: JourneyAccessRole): Promise<JourneyAccessGrant> {
      if (client === (supabase as unknown as JourneyRpcClient) && !supabaseConfigured) {
        throw new JourneyServiceError(
          'SUPABASE_NOT_CONFIGURED',
          'Supabase is not configured for cloud journey storage',
          503,
        )
      }

      const { data, error } = await client.rpc('tripbook_grant_journey_access', {
        p_trip_id: tripId,
        p_user_id: userId,
        p_role: role,
      })
      if (error) throw rpcError(error)
      return parseAccessGrant(data)
    },
  }
}

export const journeyService = createJourneyService()

export const createJourney = (journey: TripJourney) => journeyService.createJourney(journey)
export const loadJourney = (tripId: string) => journeyService.loadJourney(tripId)
export const saveJourney = (tripId: string, expectedRevision: number, journey: TripJourney) =>
  journeyService.saveJourney(tripId, expectedRevision, journey)
export const saveJourneyMemo = (tripId: string, expectedRevision: number, activityId: string, content: string) =>
  journeyService.saveMemo(tripId, expectedRevision, activityId, content)
export const grantJourneyAccess = (tripId: string, userId: string, role: JourneyAccessRole) =>
  journeyService.grantJourneyAccess(tripId, userId, role)
