<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { LEDGER_CURRENCIES, currencyDigits, formatLedgerAmount, ledgerSummary, parseLedgerAmount, splitLedgerAmount, type LedgerCurrency, type LedgerEntry, type LedgerInput, type LedgerKind, type LedgerSettlement } from '@/domain/journeyLedger'
import { loadJourneyLedger, saveJourneyLedgerEntry, voidJourneyLedgerEntry } from '@/services/journeyLedgerService'
const props = defineProps<{ tripId: string; accountId: string; members: Array<{ id: string; displayName: string | null }>; selfMemberId?: string; disabled?: boolean }>()
const entries = ref<LedgerEntry[]>([])
const loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const summaries = computed(() => ledgerSummary(entries.value).filter(summary => entries.value.some(entry => entry.currency === summary.currency)))
const form = ref<{ id: string; expectedRevision: number; kind: LedgerKind; title: string; currency: LedgerCurrency; amount: string; payerId: string; participants: string[]; occurredOn: string } | null>(null)
const pendingVoid = ref<string | null>(null)
const name = (id: string) => props.members.find(member => member.id === id)?.displayName || '未命名身分'
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Atlantic/Reykjavik', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const splitPreview = computed(() => {
 if (!form.value || form.value.kind !== 'expense' || !form.value.participants.length) return []
 try { return splitLedgerAmount(parseLedgerAmount(form.value.amount, form.value.currency), form.value.participants) } catch { return [] }
})
let epoch = 0
async function reload() {
 const current = ++epoch
 loading.value = true; error.value = ''; entries.value = []
 try { const next = await loadJourneyLedger(props.tripId); if (current === epoch) entries.value = next }
 catch (cause) { if (current === epoch) error.value = cause instanceof Error ? cause.message : '帳目讀取失敗，請重試。' }
 finally { if (current === epoch) loading.value = false }
}
function startExpense() {
 form.value = { id: crypto.randomUUID(), expectedRevision: 0, kind: 'expense', title: '', currency: 'ISK', amount: '', payerId: props.selfMemberId || '', participants: [], occurredOn: today() }
 error.value = ''; notice.value = ''; pendingVoid.value = null
}
function startRepayment(settlement: LedgerSettlement) {
 form.value = { id: crypto.randomUUID(), expectedRevision: 0, kind: 'repayment', title: '還款', currency: settlement.currency, amount: String(settlement.amountMinor / 10 ** currencyDigits(settlement.currency)), payerId: settlement.from, participants: [settlement.to], occurredOn: today() }
 error.value = ''; notice.value = ''; pendingVoid.value = null
}
function edit(entry: LedgerEntry) {
 form.value = { id: entry.id, expectedRevision: entry.revision, kind: entry.kind, title: entry.title, currency: entry.currency, amount: String(entry.amountMinor / 10 ** currencyDigits(entry.currency)), payerId: entry.payerId, participants: entry.allocations.map(item => item.memberId), occurredOn: entry.occurredOn }
 error.value = ''; notice.value = ''; pendingVoid.value = null
}
async function save() {
 if (!form.value || busy.value || props.disabled || loading.value) return
 let input: LedgerInput
 try {
  const draft = form.value
  if (!draft.title.trim() || !draft.occurredOn || !draft.payerId || !draft.participants.length) throw new Error('請填日期、項目、付款人與分攤對象。')
  if (draft.kind === 'repayment' && (draft.participants.length !== 1 || draft.participants[0] === draft.payerId)) throw new Error('還款人與收款人不能相同。')
  input = { ...draft, title: draft.title.trim(), amountMinor: parseLedgerAmount(draft.amount, draft.currency) }
 } catch (cause) { error.value = cause instanceof Error ? cause.message : '請檢查輸入內容。'; return }
 const current = epoch
 busy.value = true; error.value = ''; notice.value = ''
 try {
  const next = await saveJourneyLedgerEntry(props.tripId, input)
  if (current === epoch) { entries.value = next; form.value = null; notice.value = '已儲存到共同帳目。' }
 } catch (cause) { if (current === epoch) error.value = cause instanceof Error ? cause.message : '儲存尚未確認，請重新載入核對。' }
 finally { if (current === epoch) busy.value = false }
}
async function voidEntry(entry: LedgerEntry) {
 if (busy.value || props.disabled || loading.value) return
 const current = epoch
 busy.value = true; error.value = ''; notice.value = ''
 try {
  const next = await voidJourneyLedgerEntry(props.tripId, entry)
  if (current === epoch) { entries.value = next; pendingVoid.value = null; notice.value = '已作廢；這筆紀錄不再計入分帳。' }
 } catch (cause) { if (current === epoch) error.value = cause instanceof Error ? cause.message : '作廢尚未確認，請重新載入核對。' }
 finally { if (current === epoch) busy.value = false }
}
watch(() => [props.tripId, props.accountId], () => { form.value = null; pendingVoid.value = null; busy.value = false; notice.value = ''; void reload() }, { immediate: true })
watch(() => props.disabled, disabled => { if (!disabled) void reload() })
onBeforeUnmount(() => { epoch++ })
</script>
<template>
 <div class="journey-ledger">
  <p class="ledger-intro">共同支出與還款依原幣別分開計算，所有成員可查看。登記還款只記錄已發生的還款。</p>
  <p v-if="disabled" role="status">離線時無法讀取或更改雲端帳目，請連線後再試。</p>
  <div class="ledger-actions"><button type="button" :disabled="disabled || busy || loading" @click="startExpense">＋ 新增支出</button><button type="button" :disabled="busy || loading || disabled" @click="reload">{{ loading ? '讀取中…' : '重新載入帳目' }}</button></div>
  <p v-if="error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
  <form v-if="form" class="ledger-form" @submit.prevent="save">
   <h3>{{ form.expectedRevision ? '修改紀錄' : form.kind === 'expense' ? '新增共同支出' : '登記已還款' }}</h3>
   <fieldset :disabled="busy || disabled || loading">
    <div class="ledger-fields"><label>日期<input v-model="form.occurredOn" type="date" required min="2000-01-01" max="2100-12-31" /></label><label>項目<input v-model="form.title" required maxlength="120" placeholder="例如：晚餐、加油" /></label><label>幣別<select v-model="form.currency"><option v-for="currency in LEDGER_CURRENCIES" :key="currency" :value="currency">{{ currency }}</option></select></label><label>金額<input v-model="form.amount" type="text" :inputmode="currencyDigits(form.currency) ? 'decimal' : 'numeric'" required placeholder="0" /></label></div>
    <label>{{ form.kind === 'expense' ? '付款人' : '還款人' }}<select v-model="form.payerId" required><option value="" disabled>請選擇</option><option v-for="member in members" :key="member.id" :value="member.id">{{ member.displayName || '未命名身分' }}</option></select></label>
    <fieldset v-if="form.kind === 'expense'" class="ledger-participants"><legend>誰一起分攤？</legend><div class="participant-actions"><button type="button" @click="form.participants=members.map(member=>member.id)">選取全員</button><button type="button" @click="form.participants=[]">清除</button></div><div class="participant-chips"><label v-for="member in members" :key="member.id" :class="{ selected: form.participants.includes(member.id) }"><input v-model="form.participants" type="checkbox" :value="member.id" /><span aria-hidden="true">{{form.participants.includes(member.id) ? '✓' : '＋'}}</span>{{ member.displayName || '未命名身分' }}</label></div></fieldset>
    <label v-else>收款人<select :value="form.participants[0]" required @change="form.participants=[($event.target as HTMLSelectElement).value]"><option v-for="member in members.filter(member=>member.id!==form?.payerId)" :key="member.id" :value="member.id">{{ member.displayName || '未命名身分' }}</option></select></label>
    <p v-if="splitPreview.length" class="ledger-preview">平分預覽：<span v-for="part in splitPreview" :key="part.memberId">{{name(part.memberId)}} {{formatLedgerAmount(part.amountMinor,form.currency)}}；</span></p>
    <div class="ledger-actions"><button type="submit" class="ledger-primary">{{ busy ? '儲存中…' : '儲存紀錄' }}</button><button type="button" @click="form=null">取消</button></div>
   </fieldset>
  </form>
  <section v-for="summary in summaries" :key="summary.currency" class="ledger-summary"><h3>{{summary.currency}} · 共同支出 {{formatLedgerAmount(summary.expenseTotal,summary.currency)}}</h3><p v-if="!summary.settlements.length">此幣別目前已結清。</p><div v-for="settlement in summary.settlements" :key="`${settlement.from}-${settlement.to}`" class="ledger-settlement"><span>{{name(settlement.from)}} → {{name(settlement.to)}}　{{formatLedgerAmount(settlement.amountMinor,settlement.currency)}}</span><button type="button" :disabled="busy || disabled || loading" @click="startRepayment(settlement)">登記已還款</button></div></section>
  <p v-if="!entries.length && !loading && !error && !disabled">尚無記帳紀錄，可先新增第一筆共同支出。</p>
  <ol class="ledger-entries"><li v-for="entry in entries" :key="entry.id"><div class="ledger-entry-heading"><b>{{entry.kind==='repayment' ? '還款 · ' : ''}}{{entry.title}}</b><strong>{{formatLedgerAmount(entry.amountMinor,entry.currency)}}</strong></div><p>{{entry.occurredOn}} · {{name(entry.payerId)}}{{entry.kind==='repayment' ? ' 還款' : ' 先付'}}</p><p>{{entry.kind==='repayment' ? '收款：' : '分攤：'}}<span v-for="part in entry.allocations" :key="part.memberId">{{name(part.memberId)}} {{formatLedgerAmount(part.amountMinor,entry.currency)}}；</span></p><div v-if="entry.canManage" class="ledger-actions"><button type="button" :disabled="busy || disabled || loading" @click="edit(entry)">修改</button><button type="button" :disabled="busy || disabled || loading" @click="pendingVoid=entry.id">作廢</button></div><div v-if="pendingVoid===entry.id" class="ledger-confirm"><p>確定作廢「{{entry.title}}」？這筆紀錄將不再計入分帳。</p><button type="button" :disabled="busy || disabled || loading" @click="voidEntry(entry)">確定作廢</button><button type="button" :disabled="busy" @click="pendingVoid=null">取消</button></div></li></ol>
 </div>
</template>
<style scoped>
.journey-ledger{font-size:13px;line-height:1.7}.ledger-intro,.ledger-preview{color:#68766f;font-size:12px}.ledger-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.journey-ledger button{min-height:44px;padding:8px 12px;border:1px solid #ccd5cf;border-radius:9px;background:#f7f8f6;color:#397d86;font:inherit;cursor:pointer}.journey-ledger button:disabled{opacity:.5;cursor:default}.journey-ledger button:focus-visible,.journey-ledger input:focus-visible,.journey-ledger select:focus-visible{outline:3px solid #83b3b6;outline-offset:2px}.ledger-form{padding:16px;margin:14px 0;background:white;border:1px solid #dde3de;border-radius:14px}.journey-ledger fieldset{min-width:0;border:0;padding:0;margin:0}.journey-ledger label{display:grid;gap:4px;margin-bottom:10px}.journey-ledger :is(input:not([type=checkbox]),select){min-width:0;min-height:44px;width:100%;border:1px solid #ccd5cf;border-radius:8px;padding:8px;background:white;color:#263331;font:inherit}.ledger-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px}.ledger-participants label{display:inline-flex;align-items:center;gap:8px;min-height:44px;margin:0 16px 0 0}.ledger-participants input{width:18px;height:18px;accent-color:#397d86}.journey-ledger h3{font-size:15px;font-weight:600;margin:10px 0}.ledger-summary{padding:12px 0;border-bottom:1px solid #ccd5cf}.ledger-settlement{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin:8px 0}.ledger-entries{list-style:none;margin:16px 0;padding:0}.ledger-entries li{padding:14px 0;border-bottom:1px solid #dde3de;overflow-wrap:anywhere}.ledger-entry-heading{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px 12px}.ledger-confirm{padding:12px;background:#e5ebdf;border-radius:10px}.ledger-confirm button{margin:8px 8px 0 0}.journey-ledger [role=alert]{color:#a44f2e}.ledger-entry-heading strong{white-space:nowrap}.journey-ledger :is(input,select,button){box-sizing:border-box}@media(max-width:390px){.ledger-fields{grid-template-columns:minmax(0,1fr)}}

.ledger-participants{position:relative;margin:10px 0!important}.ledger-participants legend{padding:0 100px 8px 0;font-weight:600}.participant-actions{position:absolute;right:0;top:-10px;display:flex;gap:12px}.participant-actions button{padding:0;border:0;background:transparent;font-size:12px}.participant-chips{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px}.participant-chips label{position:relative;display:flex;align-items:center;min-height:44px;margin:0;padding:9px 12px;border:1px solid #ccd5cf;border-radius:10px;background:white;cursor:pointer}.participant-chips label.selected{border-color:#397d86;background:#eaf3f2;color:#397d86}.participant-chips input{position:absolute;opacity:0;width:1px;height:1px}.participant-chips label:focus-within{outline:3px solid #83b3b6;outline-offset:2px}.participant-chips span{color:#397d86}.journey-ledger .ledger-primary{background:#397d86;border-color:#397d86;color:white}.ledger-preview{padding:12px;border:1px solid #dde3de;border-radius:9px;background:#f7f8f6}.ledger-preview span{display:block;font-variant-numeric:tabular-nums}.journey-ledger .ledger-actions>button{background:white}.journey-ledger .ledger-actions>.ledger-primary{background:#397d86}
</style>
