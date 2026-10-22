import { beforeEach, describe, expect, it, vi } from 'vitest'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/services/supabase', () => ({ supabase: { rpc } }))
import { loadJourneyLedger, parseLedger, saveJourneyLedgerEntry } from '@/services/journeyLedgerService'
const row = () => ({ id: '30000000-0000-0000-0000-000000000001', kind: 'expense', title: 'Dinner', currency: 'GBP', amountMinor: 101,
 payerId: 'm1', allocations: [{ memberId: 'm1', amountMinor: 51 }, { memberId: 'm2', amountMinor: 50 }], occurredOn: '2026-10-24', revision: 1, createdAt: '2026-10-24T12:00:00Z', canManage: true })
beforeEach(() => { rpc.mockReset() })
describe('journey ledger boundary', () => {
 it('accepts only complete, balanced records', () => {
  expect(parseLedger({ entries: [row()] })).toEqual([row()])
  for (const patch of [{ amountMinor: 0 }, { currency: 'JPY' }, { allocations: [] }, { allocations: [{ memberId: 'm1', amountMinor: 100 }] }, { kind: 'repayment', allocations: [{ memberId: 'm1', amountMinor: 101 }] }, { revision: 0 }, { canManage: 'yes' }]) expect(() => parseLedger({ entries: [{ ...row(), ...patch }] })).toThrow()
 })
 it('passes journey scope and revision to the atomic write RPC', async () => {
  rpc.mockResolvedValue({ data: { entries: [row()] }, error: null })
  await saveJourneyLedgerEntry('journey-a', { id: row().id, expectedRevision: 1, kind: 'expense', title: 'Dinner', currency: 'GBP', amountMinor: 101, payerId: 'm1', participants: ['m1','m2'], occurredOn: '2026-10-24' })
  expect(rpc).toHaveBeenCalledWith('tripbook_save_ledger_entry', expect.objectContaining({ p_trip_id: 'journey-a', p_expected_revision: 1, p_participants: ['m1','m2'], p_amount_minor: 101 }))
 })
 it('does not hide missing cloud services or membership errors as an empty ledger', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'journey_access_required' } })
  await expect(loadJourneyLedger('journey-a')).rejects.toThrow('已無法存取')
  rpc.mockResolvedValue({ data: null, error: { message: 'ledger_conflict' } })
  await expect(loadJourneyLedger('journey-a')).rejects.toThrow('帳目已更新')
 })
})
