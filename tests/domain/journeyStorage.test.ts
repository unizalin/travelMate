import { describe, expect, it } from 'vitest'
import { icelandJourney } from '@/data/icelandJourney'
import {
  journeyStorageKey,
  loadLocalJourney,
  saveLocalJourney,
  type JourneyStorage,
  withTripId,
} from '@/domain/tripJourney'

function memoryStorage(): JourneyStorage {
  const values = new Map<string, string>()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

describe('local journey persistence', () => {
  it('isolates drafts by account and trip', () => {
    const storage = memoryStorage()
    const firstDraft = withTripId(icelandJourney, 'trip-a')
    const secondDraft = withTripId(icelandJourney, 'trip-b')

    saveLocalJourney('account-a', firstDraft, storage)
    saveLocalJourney('account-b', secondDraft, storage)

    expect(loadLocalJourney('account-a', 'trip-a', storage)?.tripId).toBe('trip-a')
    expect(loadLocalJourney('account-b', 'trip-b', storage)?.tripId).toBe('trip-b')
    expect(loadLocalJourney('account-a', 'trip-b', storage)).toBeNull()
    expect(journeyStorageKey('account-a', 'trip-a')).not.toBe(journeyStorageKey('account-b', 'trip-a'))
  })

  it('returns no draft when stored JSON is invalid or fails domain validation', () => {
    const storage = memoryStorage()
    storage.setItem(journeyStorageKey('account-a', 'trip-a'), '{not-json')
    expect(loadLocalJourney('account-a', 'trip-a', storage)).toBeNull()

    storage.setItem(journeyStorageKey('account-a', 'trip-b'), JSON.stringify({ tripId: 'trip-b' }))
    expect(loadLocalJourney('account-a', 'trip-b', storage)).toBeNull()
  })
})
