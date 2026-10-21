export interface MemberPhotoPreferences {
  tripId: string
  memberId: string
  showPhotography: boolean
  phoneSpotIds: string[]
  cameraSpotIds: string[]
  updatedAt: string | null
}

export interface PhotoPreferenceMergeResult {
  merged: MemberPhotoPreferences
  conflicts: Array<'showPhotography' | 'phoneSpotIds' | 'cameraSpotIds'>
}

const KEY_PREFIX = 'tripbook:photo-preferences:v1'

function key(accountId: string, tripId: string, memberId: string): string {
  return `${KEY_PREFIX}:${accountId}:${tripId}:${memberId}`
}

function validStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

export function defaultPhotoPreferences(tripId: string, memberId: string): MemberPhotoPreferences {
  return { tripId, memberId, showPhotography: true, phoneSpotIds: [], cameraSpotIds: [], updatedAt: null }
}

export function normalizePhotoPreferences(value: unknown, tripId?: string, memberId?: string): MemberPhotoPreferences | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.tripId !== 'string' || typeof record.memberId !== 'string' || typeof record.showPhotography !== 'boolean' || !validStringArray(record.phoneSpotIds) || !validStringArray(record.cameraSpotIds)) return null
  if (tripId && record.tripId !== tripId) return null
  if (memberId && record.memberId !== memberId) return null
  return {
    tripId: record.tripId,
    memberId: record.memberId,
    showPhotography: record.showPhotography,
    phoneSpotIds: [...new Set(record.phoneSpotIds)],
    cameraSpotIds: [...new Set(record.cameraSpotIds)],
    updatedAt: record.updatedAt === null || typeof record.updatedAt === 'string' ? record.updatedAt : null,
  }
}

export function loadLocalPhotoPreferences(accountId: string, tripId: string, memberId: string, storage: Storage = window.localStorage): MemberPhotoPreferences | null {
  try {
    const raw = storage.getItem(key(accountId, tripId, memberId))
    return raw ? normalizePhotoPreferences(JSON.parse(raw), tripId, memberId) : null
  } catch {
    return null
  }
}

export function saveLocalPhotoPreferences(accountId: string, preferences: MemberPhotoPreferences, storage: Storage = window.localStorage): void {
  storage.setItem(key(accountId, preferences.tripId, preferences.memberId), JSON.stringify(normalizePhotoPreferences(preferences)))
}

export function mergePhotoPreferences(local: MemberPhotoPreferences, cloud: MemberPhotoPreferences, choose: 'local' | 'cloud' = 'cloud'): PhotoPreferenceMergeResult {
  const conflicts: PhotoPreferenceMergeResult['conflicts'] = []
  for (const field of ['showPhotography', 'phoneSpotIds', 'cameraSpotIds'] as const) {
    if (JSON.stringify(local[field]) !== JSON.stringify(cloud[field])) conflicts.push(field)
  }
  const chosen = choose === 'local' ? local : cloud
  return { merged: { ...chosen, phoneSpotIds: [...chosen.phoneSpotIds], cameraSpotIds: [...chosen.cameraSpotIds] }, conflicts }
}
