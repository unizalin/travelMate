import { describe, expect, it } from 'vitest'
import { cloneJourney, validateJourney, timelineForParticipant } from '@/domain/tripJourney'
import { icelandJourney } from '@/data/icelandJourney'
import { londonSeedItems, londonItemsForDay, isOnlyLondonAddition } from '@/domain/londonJourney'
describe('Shared London activity model', () => {
 it('stores supplied hours as notes and has only the four explicit participants', () => {
  const items = londonSeedItems(icelandJourney.tripId)
  expect(items.every(item => JSON.stringify(item.participation) === JSON.stringify(['member-2','member-3','member-4','member-5']))).toBe(true)
  expect(items.every(item => item.plannedStart === null && item.plannedEnd === null)).toBe(true)
  expect(items.find(item => item.name === '自然史博物館')?.notes).toBe('10:00–17:50')
  const journey = cloneJourney(icelandJourney); journey.items.push(...items)
  expect(validateJourney(journey).valid).toBe(true)
  expect(timelineForParticipant(journey,'member-1').some(day => day.date === '2026-10-25')).toBe(false)
  expect(timelineForParticipant(journey,'member-2').some(day => day.date === '2026-10-25')).toBe(true)
 })
 it('adopts only a pure London addition and preserves a genuine local conflict', () => {
  const local = cloneJourney(icelandJourney)
  const remote = cloneJourney(icelandJourney); remote.items.push(...londonSeedItems(remote.tripId))
  expect(isOnlyLondonAddition(local,remote)).toBe(true)
  local.items[0].name='仍需保留的本機修改'
  expect(isOnlyLondonAddition(local,remote)).toBe(false)
 })
 it('reads edited shared items instead of replacing them from a static template', () => {
  const items = londonSeedItems('trip')
  const selected = items.find(item => item.name === '自然史博物館')!
  selected.name = '大家修改的博物館'; selected.notes = '在入口集合'
  expect(londonItemsForDay(items,'2026-10-25').find(item => item.id === selected.id)?.name).toBe('大家修改的博物館')
  expect(londonItemsForDay(items,'2026-10-25').some(item => item.status === 'fallback')).toBe(false)
  expect(items.filter(item => item.status === 'fallback')).toHaveLength(6)
 })
})
