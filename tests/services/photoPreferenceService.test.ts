import { describe, expect, it } from 'vitest'
import { createPhotoPreferenceService, PhotoPreferenceServiceError } from '@/services/photoPreferenceService'

describe('photo preference service', () => {
  it('parses load and save RPC payloads with member scope', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = []
    const client = { rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args })
      return { data: { tripId: 'trip', memberId: 'member', showPhotography: false, phoneSpotIds: ['phone'], cameraSpotIds: [], updatedAt: '2026-10-15T00:00:00Z' }, error: null }
    } }
    const service = createPhotoPreferenceService(client)
    const loaded = await service.loadPreferences('trip', 'member')
    expect(loaded.showPhotography).toBe(false)
    await service.savePreferences(loaded, loaded.updatedAt)
    expect(calls.map(call => call.name)).toEqual(['tripbook_load_photo_preferences', 'tripbook_save_photo_preferences'])
    expect(calls[1].args.p_expected_updated_at).toBe(loaded.updatedAt)
  })

  it('maps RPC conflicts', async () => {
    const client = { rpc: async () => ({ data: null, error: { message: 'photo_preferences_conflict' } }) }
    await expect(createPhotoPreferenceService(client).loadPreferences('trip', 'member')).rejects.toMatchObject<Partial<PhotoPreferenceServiceError>>({ code: 'PHOTO_PREFERENCES_CONFLICT' })
  })
})
