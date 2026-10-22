import { supabase } from '@/services/supabase'
import { LEDGER_CURRENCIES, type LedgerAllocation, type LedgerCurrency, type LedgerEntry, type LedgerInput } from '@/domain/journeyLedger'
type Result = { data: unknown; error: { message: string; code?: string } | null }
const rpc = supabase.rpc.bind(supabase) as (name: string, args: Record<string, unknown>) => PromiseLike<Result>
const invalid = () => new Error('帳目資料格式無效，請重新載入。')
function record(value: unknown): Record<string, unknown> {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid()
 return Object.fromEntries(Object.entries(value))
}
function isCurrency(value: unknown): value is LedgerCurrency { return LEDGER_CURRENCIES.some(currency => currency === value) }
function allocation(value: unknown): LedgerAllocation {
 const item = record(value)
 if (typeof item.memberId !== 'string' || !item.memberId || typeof item.amountMinor !== 'number' || !Number.isSafeInteger(item.amountMinor) || item.amountMinor < 0) throw invalid()
 return { memberId: item.memberId, amountMinor: item.amountMinor }
}
export function parseLedger(value: unknown): LedgerEntry[] {
 const body = record(value)
 if (!Array.isArray(body.entries)) throw invalid()
 return body.entries.map((value: unknown): LedgerEntry => {
  const item = record(value)
  if (typeof item.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(item.id)
   || (item.kind !== 'expense' && item.kind !== 'repayment') || typeof item.title !== 'string' || !item.title.trim()
   || !isCurrency(item.currency) || typeof item.amountMinor !== 'number' || !Number.isSafeInteger(item.amountMinor) || item.amountMinor <= 0 || item.amountMinor > 1_000_000_000_000
   || typeof item.payerId !== 'string' || !item.payerId || !Array.isArray(item.allocations)
   || typeof item.occurredOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.occurredOn)
   || typeof item.revision !== 'number' || !Number.isSafeInteger(item.revision) || item.revision < 1
   || typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt)) || typeof item.canManage !== 'boolean') throw invalid()
  const allocations = item.allocations.map(allocation)
  if (!allocations.length || new Set(allocations.map(a => a.memberId)).size !== allocations.length
   || allocations.reduce((total, a) => total + a.amountMinor, 0) !== item.amountMinor
   || (item.kind === 'repayment' && (allocations.length !== 1 || allocations[0]?.memberId === item.payerId))) throw invalid()
  return { id: item.id, kind: item.kind, title: item.title, currency: item.currency, amountMinor: item.amountMinor,
   payerId: item.payerId, allocations, occurredOn: item.occurredOn, revision: item.revision, createdAt: item.createdAt, canManage: item.canManage }
 })
}
async function invoke(name: string, args: Record<string, unknown>) {
 const { data, error } = await rpc(name, args)
 if (error) {
  const messages: Record<string, string> = {
   journey_access_required: '此帳號已無法存取這份旅程的帳目。',
   journey_editor_required: '目前帳號沒有這份旅程的記帳權限。',
   ledger_author_required: '只有記錄者或旅程建立者可以修改這筆紀錄。',
   ledger_conflict: '帳目已更新，請重新載入後再選擇要修改的紀錄。',
   invalid_ledger_entry: '請確認日期、項目、幣別與金額。',
   invalid_ledger_members: '請確認付款人與分攤對象。',
  }
  throw new Error(messages[error.message] ?? '帳目服務暫時無法使用；變更尚未確認，請重新載入核對。')
 }
 return parseLedger(data)
}
export const loadJourneyLedger = (tripId: string) => invoke('tripbook_ledger', { p_trip_id: tripId })
export const saveJourneyLedgerEntry = (tripId: string, entry: LedgerInput) => invoke('tripbook_save_ledger_entry', {
 p_trip_id: tripId, p_id: entry.id, p_expected_revision: entry.expectedRevision, p_kind: entry.kind,
 p_title: entry.title, p_currency: entry.currency, p_amount_minor: entry.amountMinor, p_payer_id: entry.payerId,
 p_participants: entry.participants, p_occurred_on: entry.occurredOn,
})
export const voidJourneyLedgerEntry = (tripId: string, entry: LedgerEntry) => invoke('tripbook_void_ledger_entry', { p_trip_id: tripId, p_id: entry.id, p_expected_revision: entry.revision })
