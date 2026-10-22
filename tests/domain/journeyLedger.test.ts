import { describe, expect, it } from 'vitest'
import { ledgerSummary, parseLedgerAmount, splitLedgerAmount, type LedgerEntry } from '@/domain/journeyLedger'
const expense = (patch: Partial<LedgerEntry> = {}): LedgerEntry => ({
 id: 'fixture', kind: 'expense', title: '共同餐費', currency: 'GBP', amountMinor: 100,
 payerId: 'u', allocations: splitLedgerAmount(100, ['u', 'j', 'k']), occurredOn: '2026-10-24',
 revision: 1, createdAt: '2026-10-24T12:00:00Z', canManage: true, ...patch,
})
describe('journey ledger arithmetic', () => {
 it('splits indivisible minor units deterministically without losing money', () => {
  expect(splitLedgerAmount(100, ['u', 'j', 'k'])).toEqual([{ memberId: 'j', amountMinor: 34 }, { memberId: 'k', amountMinor: 33 }, { memberId: 'u', amountMinor: 33 }])
  expect(splitLedgerAmount(1, ['u', 'j', 'k']).reduce((sum, item) => sum + item.amountMinor, 0)).toBe(1)
 })
 it('parses decimal currencies exactly and enforces ISK whole units', () => {
  expect(parseLedgerAmount('0.29', 'GBP')).toBe(29)
  expect(parseLedgerAmount('10.2', 'TWD')).toBe(1020)
  expect(parseLedgerAmount('1200', 'ISK')).toBe(1200)
  for (const value of ['-1', '0', 'NaN', 'Infinity', '1e3', '1.234']) expect(() => parseLedgerAmount(value, 'GBP')).toThrow()
  expect(() => parseLedgerAmount('1.5', 'ISK')).toThrow()
 })
 it('only charges selected participants and keeps currencies separate', () => {
  const summaries = ledgerSummary([expense(), expense({ currency: 'ISK', amountMinor: 600, allocations: splitLedgerAmount(600, ['u', 'j']) })])
  expect(summaries[0]!.settlements).toEqual([{ currency: 'GBP', from: 'j', to: 'u', amountMinor: 34 }, { currency: 'GBP', from: 'k', to: 'u', amountMinor: 33 }])
  expect(summaries[1]!.settlements).toEqual([{ currency: 'ISK', from: 'j', to: 'u', amountMinor: 300 }])
  expect([...summaries[0]!.balances.values()].reduce((sum, value) => sum + value, 0)).toBe(0)
 })
 it('deducts recorded repayments without counting them as expenses', () => {
  const summary = ledgerSummary([expense(), expense({ kind: 'repayment', payerId: 'j', amountMinor: 34, allocations: [{ memberId: 'u', amountMinor: 34 }] })])[0]!
  expect(summary.expenseTotal).toBe(100)
  expect(summary.settlements).toEqual([{ currency: 'GBP', from: 'k', to: 'u', amountMinor: 33 }])
 })
 it('rejects duplicate or missing split participants', () => {
  expect(() => splitLedgerAmount(100, [])).toThrow()
  expect(() => splitLedgerAmount(100, ['u', 'u'])).toThrow()
 })
})
