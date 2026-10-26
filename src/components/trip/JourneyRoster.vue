<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import JourneyFlightCard from './JourneyFlightCard.vue'
import { icelandMemberName } from '@/data/icelandMemberNames'
import { icelandFlights } from '@/data/icelandFlights'
import { chooseFlight, loadRoster, type JourneyRoster } from '@/services/journeyRosterService'
const emit = defineEmits<{ update: [value: JourneyRoster] }>()
const props = defineProps<{ tripId: string; accountId: string; canEdit: boolean; members: Array<{ id: string; displayName: string | null }> }>()
const roster = ref<JourneyRoster>({ claims: [], choices: [] })
const busy = ref(false)
const loaded = ref(false)
const error = ref('')
const selecting = ref(false)
const myFlights = computed(() => icelandFlights.filter(flight => selected(flight.id)))
const visibleFlights = computed(() => selecting.value ? icelandFlights : myFlights.value)
const fliesIcelandairViaLondon = computed(() => selected('fi0454') && selected('ci0082'))
let epoch = 0
const ready = computed(() => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(props.tripId) && props.accountId !== 'local-preview')
const self = computed(() => roster.value.claims.find(c => c.isSelf))


function label(id: string) {
  return icelandMemberName(id, props.members.find(m => m.id === id)?.displayName || roster.value.claims.find(c => c.memberId === id)?.name)
}

function selected(flightId: string) { return roster.value.choices.some(c => c.flightId === flightId && c.memberId === self.value?.memberId) }
async function run(action: () => Promise<JourneyRoster>) {
  if (busy.value || !ready.value) return
  const current = ++epoch
  busy.value = true; error.value = ''
  try { const result = await action(); if (current === epoch) { roster.value = result; loaded.value = true; emit('update', result) } }
  catch (cause) { if (current === epoch) error.value = cause instanceof Error ? cause.message : '更新失敗，請重試。' }
  finally { if (current === epoch) busy.value = false }
}
watch(() => [props.tripId, props.accountId], () => {
  epoch++; busy.value = false; loaded.value = false; error.value = ''; selecting.value = false; roster.value = { claims: [], choices: [] }
  emit('update', roster.value)
  if (ready.value) void run(() => loadRoster(props.tripId))
}, { immediate: true })
let refreshTimer: ReturnType<typeof setInterval> | undefined
function refreshVisibleRoster() {
  if (ready.value && !busy.value && document.visibilityState === 'visible') void run(() => loadRoster(props.tripId))
}
onMounted(() => { refreshTimer = setInterval(refreshVisibleRoster, 30_000); window.addEventListener('focus', refreshVisibleRoster) })
onBeforeUnmount(() => { epoch++; if (refreshTimer) clearInterval(refreshTimer); window.removeEventListener('focus', refreshVisibleRoster) })
</script>
<template>
  <section aria-label="身分與航班" class="journey-roster">
    <div class="flight-heading"><h2>我的航班</h2><button v-if="self" type="button" @click="selecting=!selecting">{{ selecting ? '完成選擇' : myFlights.length ? '更改航班' : '選擇航班' }}</button></div>
    <p v-if="!ready" class="mt-3 text-sm text-stone-600">受邀加入旅程並認領身分後，即可選擇航班。</p>
    <p v-if="error" role="alert" class="mt-3 text-sm text-red-700">{{ error }}</p>
    <p v-if="busy" role="status" class="mt-3 text-sm">正在同步…</p>
    <template v-if="loaded">
      <p v-if="!self" class="mt-3 text-sm text-stone-600">請使用有效邀請連結認領自己的身分。</p>
      <p v-if="self" class="selected-summary">已選 {{myFlights.length}} 段：{{myFlights.map(f=>f.name).join('、') || '尚未選擇'}}</p>
      <p v-if="self" class="self-name">{{ label(self.memberId) }}</p>
      <p v-if="self && !myFlights.length" class="muted">尚未選擇航班，請按「選擇航班」查看班次。</p>
      <div v-if="self" class="flight-cards"><JourneyFlightCard v-for="flight in visibleFlights" :key="flight.id" :flight="flight">
        <template v-if="flight.id==='ba801'" #reminder><span>11/7 Blue Lagoon 與這班航班的銜接待核對；退房、加油、還車及機場抵達時間依實際預約安排。</span></template>
        <p class="muted">同行名單：{{ roster.choices.filter(choice => choice.flightId === flight.id).map(choice => label(choice.memberId)).join('、') || '尚未選擇' }}</p>
        <button v-if="selecting" type="button" :aria-pressed="selected(flight.id)" :disabled="busy || !canEdit || !self" @click="run(() => chooseFlight(tripId,flight.id,!selected(flight.id)))">{{ selected(flight.id)?'取消搭乘':'我搭這班' }}</button>
      </JourneyFlightCard></div>
      <section v-if="self && selected('fi0454')" class="departure-guide" aria-label="冰島離境注意事項">
        <h3>冰島離境注意事項</h3>
        <ol>
          <li><b>提前到機場</b>：KEF 建議起飛前 2.5–3 小時抵達。預留還車、報到與安檢時間。</li>
          <li><b>報到與托運</b>：可用自助機辦理報到、列印登機證與行李條，再到自助行李托運區。貼標後檢查是否牢固、航班與行李條目的地是否正確；若不確定操作，改到人工櫃檯請人員協助。</li>
          <li v-if="fliesIcelandairViaLondon"><b>先確認能否直掛</b>：這兩段跨航空公司的行李能否直掛，須由冰島航空依實際訂位確認。行李交出前，向人工櫃檯出示 FI0454、CI0082 兩段機票，並說 <span lang="en">“Direct to Taipei (TPE), please. Can you check my bag through to TPE? Please confirm the destination on the bag tag.”</span> 核對行李條上是 <b>TPE</b> 還是 <b>LHR</b>，保留收據。轉機複雜或不熟悉自助貼標時，優先排人工櫃檯。</li>
          <li><b>安檢與護照查驗</b>：安檢後依螢幕與指標前往 D 區登機門；飛往英國須經離開申根區的護照查驗，預留排隊時間。登機門可能變動，依現場公告為準。</li>
        </ol>
        <template v-if="fliesIcelandairViaLondon">
          <h4>倫敦希斯洛轉機</h4>
          <ol>
            <li>FI0454 預計 19:30 抵達，CI0082 預計 21:15 起飛，相隔 1 小時 45 分。登機前先查 CI0082 航廈，落地後立刻再看轉機電子看板。</li>
            <li>若行李條是 <b>TPE</b> 且已拿到下一段登機證，循紫色 <span lang="en">Flight Connections</span> 指標；換航廈依指標搭免費轉機接駁車，再過安檢並確認登機門。</li>
            <li>若行李條只到 <b>LHR</b>、未完成下一段報到，或兩段是分開訂票且需自行領行李，須走入境、領行李、前往出發航廈重新報到並再次安檢。此銜接時間很短，出發前先向兩家航空公司確認能否趕上及替代方案。</li>
          </ol>
        </template>
        <p class="guide-sources">官方資訊：<a href="https://www.kefairport.com/check-in-information" target="_blank" rel="noreferrer">KEF 出發流程 ↗</a> · <a href="https://www.kefairport.com/passport-control" target="_blank" rel="noreferrer">KEF 護照查驗 ↗</a> · <a href="https://www.icelandair.com/en-gb/support/pre-flight/check-in/" target="_blank" rel="noreferrer">冰島航空報到 ↗</a><template v-if="fliesIcelandairViaLondon"> · <a href="https://www.heathrow.com/connecting-flights" target="_blank" rel="noreferrer">希斯洛轉機 ↗</a></template></p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.journey-roster{min-width:0}.flight-heading{display:flex;justify-content:space-between;align-items:center;gap:8px}.flight-heading h2{font-size:14px;font-weight:600}.flight-heading button{font-size:12px;color:#397d86;min-height:36px}.self-name,.muted{font-size:12px;color:#7a8783;margin:4px 0;line-height:1.6}.flight-cards{margin-top:8px}.identity-choices button{min-height:48px;border:1px solid #dde3de;border-radius:10px;background:white;color:#263331;text-align:left;padding:10px;font-size:12px}.identity-choices button:disabled{opacity:.5}.journey-roster :is(button,input):focus-visible{outline:3px solid #83b3b6;outline-offset:3px}
.departure-guide{margin-top:16px;padding:16px;border:1px solid #dde3de;border-radius:12px;background:#f7f8f6;color:#263331;font-size:12.5px;line-height:1.7}.departure-guide h3{font-size:16px;font-weight:600;margin:0 0 8px}.departure-guide h4{font-size:14px;font-weight:600;margin:14px 0 6px}.departure-guide ol{padding-left:20px;margin:0}.departure-guide li{padding:5px 0}.departure-guide li b{font-weight:600}.guide-sources{margin:12px 0 0;font-size:11.5px;color:#68766f}.guide-sources a{color:#397d86;text-decoration:underline;text-underline-offset:2px}
</style>
