import { describe, expect, it } from 'vitest'
import { defaultPhotoPreferences, loadLocalPhotoPreferences, mergePhotoPreferences, saveLocalPhotoPreferences } from '@/domain/photoPreferences'

function storage(): Storage {
  const values = new Map<string, string>()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), clear: () => values.clear(), key: index => [...values.keys()][index] ?? null, get length() { return values.size } }
}

describe('member photo preferences', () => {
  it('keeps independent member-scoped local preferences', () => {
    const store = storage()
    const first = { ...defaultPhotoPreferences('trip', 'member-1'), phoneSpotIds: ['spot-a'] }
    saveLocalPhotoPreferences('account', first, store)
    expect(loadLocalPhotoPreferences('account', 'trip', 'member-1', store)?.phoneSpotIds).toEqual(['spot-a'])
    expect(loadLocalPhotoPreferences('account', 'trip', 'member-2', store)).toBeNull()
  })

  it('reports differences and requires an explicit side for merge', () => {
    const local = { ...defaultPhotoPreferences('trip', 'member-1'), showPhotography: false, phoneSpotIds: ['local'] }
    const cloud = { ...defaultPhotoPreferences('trip', 'member-1'), phoneSpotIds: ['cloud'] }
    expect(mergePhotoPreferences(local, cloud, 'local')).toMatchObject({ merged: local, conflicts: ['showPhotography', 'phoneSpotIds'] })
    expect(mergePhotoPreferences(local, cloud, 'cloud').merged).toMatchObject(cloud)
  })
})
