import { describe, expect, it } from 'vitest'
import { icelandJourney } from '@/data/icelandJourney'
import { validateJourney } from '@/domain/tripJourney'

describe('journey shared memo validation', () => {
  it('accepts one shared memo attached to an existing activity', () => {
    const journey = {
      ...structuredClone(icelandJourney),
      memos: { 'iceland-stop-1': { content: '抵達後確認採買清單', updatedBy: null, updatedAt: null } },
    }

    expect(validateJourney(journey).valid).toBe(true)
  })

  it('rejects unknown activity IDs and oversized memo content', () => {
    const unknown = {
      ...structuredClone(icelandJourney),
      memos: { 'removed-activity-id': { content: 'x', updatedBy: null, updatedAt: null } },
    }
    const oversized = {
      ...structuredClone(icelandJourney),
      memos: { 'iceland-stop-1': { content: 'x'.repeat(2001), updatedBy: null, updatedAt: null } },
    }

    expect(validateJourney(unknown).errors.some(error => error.includes('memos'))).toBe(true)
    expect(validateJourney(oversized).errors.some(error => error.includes('memos'))).toBe(true)
  })
})
