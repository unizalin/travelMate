export const LEDGER_CURRENCIES = ['GBP', 'ISK', 'TWD'] as const
export type LedgerCurrency = typeof LEDGER_CURRENCIES[number]
export type LedgerKind = 'expense' | 'repayment'
export type LedgerAllocation = { memberId: string; amountMinor: number }
export type LedgerEntry = {
  id: string; kind: LedgerKind; title: string; currency: LedgerCurrency; amountMinor: number
  payerId: string; allocations: LedgerAllocation[]; occurredOn: string; revision: number
  createdAt: string; canManage: boolean
}
export type LedgerInput = {
  id: string; expectedRevision: number; kind: LedgerKind; title: string; currency: LedgerCurrency
  amountMinor: number; payerId: string; participants: string[]; occurredOn: string
}
export type LedgerSettlement = { currency: LedgerCurrency; from: string; to: string; amountMinor: number }
export const currencyDigits = (currency: LedgerCurrency) => currency === 'ISK' ? 0 : 2
export function parseLedgerAmount(value: string, currency: LedgerCurrency): number {
  const digits = currencyDigits(currency)
  if (!(digits ? /^\d+(?:\.\d{1,2})?$/ : /^\d+$/).test(value.trim())) throw new Error(digits ? '金額最多兩位小數。' : 'ISK 請輸入整數金額。')
  const [whole, fraction = ''] = value.trim().split('.')
  const amount = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0'))
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000_000_000) throw new Error('請輸入有效的正數金額。')
  return amount
}
export function formatLedgerAmount(amountMinor: number, currency: LedgerCurrency): string {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency, currencyDisplay: 'code' }).format(amountMinor / 10 ** currencyDigits(currency))
}
export function splitLedgerAmount(amountMinor: number, members: string[]): LedgerAllocation[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || members.length === 0 || new Set(members).size !== members.length) throw new Error('請確認金額與分攤對象。')
  const ordered = [...members].sort()
  return ordered.map((memberId, index) => ({ memberId, amountMinor: Math.floor(amountMinor / ordered.length) + (index < amountMinor % ordered.length ? 1 : 0) }))
}
export function ledgerSummary(entries: LedgerEntry[]) {
  return LEDGER_CURRENCIES.map(currency => {
    const balances = new Map<string, number>()
    let expenseTotal = 0
    for (const entry of entries.filter(item => item.currency === currency)) {
      if (entry.kind === 'expense') expenseTotal += entry.amountMinor
      balances.set(entry.payerId, (balances.get(entry.payerId) ?? 0) + entry.amountMinor)
      for (const allocation of entry.allocations) balances.set(allocation.memberId, (balances.get(allocation.memberId) ?? 0) - allocation.amountMinor)
    }
    const creditors = [...balances].filter(([, value]) => value > 0).sort(([a], [b]) => a.localeCompare(b)).map(([memberId, amount]) => ({ memberId, amount }))
    const debtors = [...balances].filter(([, value]) => value < 0).sort(([a], [b]) => a.localeCompare(b)).map(([memberId, amount]) => ({ memberId, amount: -amount }))
    const settlements: LedgerSettlement[] = []
    let creditorIndex = 0
    for (const debtor of debtors) {
      while (debtor.amount > 0 && creditorIndex < creditors.length) {
        const creditor = creditors[creditorIndex]
        if (!creditor) break
        const amountMinor = Math.min(debtor.amount, creditor.amount)
        settlements.push({ currency, from: debtor.memberId, to: creditor.memberId, amountMinor })
        debtor.amount -= amountMinor; creditor.amount -= amountMinor
        if (creditor.amount === 0) creditorIndex++
      }
    }
    return { currency, expenseTotal, balances, settlements }
  })
}
