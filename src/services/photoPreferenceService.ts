import { supabase, supabaseConfigured } from '@/services/supabase'
import { normalizePhotoPreferences, type MemberPhotoPreferences } from '@/domain/photoPreferences'

export class PhotoPreferenceServiceError extends Error {
  constructor(readonly code: string, message: string, readonly details?: unknown) {
    super(message)
    this.name = 'PhotoPreferenceServiceError'
  }
}

type RpcClient = { rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { code?: string; message: string; details?: unknown } | null }> }

function parse(data: unknown, tripId: string, memberId: string): MemberPhotoPreferences {
  const value = Array.isArray(data) && data.length === 1 ? data[0] : data
  const result = normalizePhotoPreferences(value, tripId, memberId)
  if (!result) throw new PhotoPreferenceServiceError('INVALID_RESPONSE', '攝影偏好回應格式無效', value)
  return result
}

function mapError(error: { code?: string; message: string; details?: unknown }): PhotoPreferenceServiceError {
  const message = error.message || 'photo_preferences_failed'
  const lower = message.toLowerCase()
  if (lower.includes('not_authenticated')) return new PhotoPreferenceServiceError('AUTHENTICATION_REQUIRED', message, error)
  if (lower.includes('forbidden') || lower.includes('access_required')) return new PhotoPreferenceServiceError('PHOTO_PREFERENCES_FORBIDDEN', message, error)
  if (lower.includes('conflict') || error.code === '409') return new PhotoPreferenceServiceError('PHOTO_PREFERENCES_CONFLICT', message, error)
  return new PhotoPreferenceServiceError(error.code || 'PHOTO_PREFERENCES_FAILED', message, error)
}

export function createPhotoPreferenceService(client: RpcClient = supabase as unknown as RpcClient) {
  async function invoke(name: string, args: Record<string, unknown>, tripId: string, memberId: string): Promise<MemberPhotoPreferences> {
    if (client === (supabase as unknown as RpcClient) && !supabaseConfigured) throw new PhotoPreferenceServiceError('SUPABASE_NOT_CONFIGURED', 'Supabase 尚未設定')
    const { data, error } = await client.rpc(name, args)
    if (error) throw mapError(error)
    return parse(data, tripId, memberId)
  }
  return {
    loadPreferences: (tripId: string, memberId: string) => invoke('tripbook_load_photo_preferences', { p_trip_id: tripId, p_member_id: memberId }, tripId, memberId),
    savePreferences: (preferences: MemberPhotoPreferences, expectedUpdatedAt: string | null = preferences.updatedAt) => invoke('tripbook_save_photo_preferences', {
      p_trip_id: preferences.tripId,
      p_member_id: preferences.memberId,
      p_show_photography: preferences.showPhotography,
      p_phone_spot_ids: preferences.phoneSpotIds,
      p_camera_spot_ids: preferences.cameraSpotIds,
      p_expected_updated_at: expectedUpdatedAt,
    }, preferences.tripId, preferences.memberId),
  }
}

export const photoPreferenceService = createPhotoPreferenceService()
