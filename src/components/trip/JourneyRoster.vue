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
const londonOnward = computed(() => selected('fi0454') ? myFlights.value.find(flight => flight.from === 'LHR' && flight.group === 'return-europe') : undefined)
const londonConnectionTime = computed(() => {
  const onward = londonOnward.value
  const inbound = icelandFlights.find(flight => flight.id === 'fi0454')
  if (!onward || !inbound) return ''
  const minutes = (time: string) => { const [hours, mins] = time.split(':').map(Number); return hours * 60 + mins }
  const difference = minutes(onward.departure) - minutes(inbound.arrival)
  return difference > 0 ? `${Math.floor(difference / 60)} 小時 ${difference % 60} 分` : ''
})
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
          <li><b>提前 3 小時到 KEF</b>：預留還車、報到、托運、安檢與護照查驗時間；機場建議起飛前 2.5–3 小時抵達。</li>
          <li><b>選擇自助或人工托運</b>：自助區可辦理報到、列印登機證與行李條，並自行貼標、到自助托運區交行李。交出前核對行李條的姓名與目的地，確認貼牢，保留托運收據；貼錯或脫落會增加行李延誤、追查困難的風險。若不會貼、現場無法立即取得協助，就改排人工櫃檯。</li>
          <li v-if="londonOnward"><b>請人工櫃檯確認直掛台北</b>：若全程轉機兩次以上、要換航廈，或擔心自助貼標出錯，建議選人工托運。出示 FI0454 與後續航班的訂位，用下方英文請人員確認能否直掛，並當面看行李條目的地是 <b>TPE</b> 還是 <b>LHR</b>。跨航空公司能否直掛須依實際票券與航空公司答覆，不能只靠自助機顯示推定。</li>
          <li><b>到 2 樓安檢，再往 D 區</b>：安檢可能排隊。飛往英國須經離開申根區的護照查驗，再依螢幕前往 D 區登機門；護照查驗也要預留排隊時間，登機門以現場公告為準。</li>
        </ol>
        <div v-if="londonOnward" class="counter-script">
          <h4>人工櫃檯英文說法</h4>
          <p lang="en">Hi, I’m going to Taipei via London. Can you check my bag all the way to Taipei (TPE)? Does the bag tag say TPE? If not, do I pick it up in London?</p>
        </div>
        <template v-if="londonOnward">
          <h4>抵達倫敦希斯洛後</h4>
          <ol>
            <li><b>先找下一段航廈</b>：登機前先查 {{ londonOnward?.name }} 航廈；下機後立刻再看電子看板。FI0454 預計 19:30 抵達、{{ londonOnward?.name }} 預計 {{ londonOnward?.departure }} 起飛，表定只隔 {{ londonConnectionTime }}。</li>
            <li><b>已確認行李直掛 TPE</b>：循紫色 <span lang="en">Flight Connections</span> 指標；若要換航廈，依指標搭免費轉機接駁車。抵達下一航廈後再次安檢，再查登機門與登機時間。</li>
            <li><b>行李只到 LHR 或須自行轉機</b>：走入境、領行李，前往出發航廈重新報到、托運並安檢。若為分開訂票，希斯洛提醒通常必須自行完成這些步驟；時間非常緊，出發前先向兩家航空公司確認能否銜接與替代方案。</li>
          </ol>
        </template>
        <p class="guide-sources">官方資訊：<a href="https://www.kefairport.com/check-in-information" target="_blank" rel="noreferrer">KEF 出發流程 ↗</a> · <a href="https://www.kefairport.com/fast-track" target="_blank" rel="noreferrer">KEF 安檢樓層 ↗</a> · <a href="https://www.kefairport.com/passport-control" target="_blank" rel="noreferrer">KEF 護照查驗 ↗</a> · <a href="https://www.icelandair.com/en-gb/support/pre-flight/check-in/" target="_blank" rel="noreferrer">冰島航空報到 ↗</a><template v-if="londonOnward"> · <a href="https://www.heathrow.com/connecting-flights" target="_blank" rel="noreferrer">希斯洛轉機 ↗</a></template></p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.journey-roster{min-width:0}.flight-heading{display:flex;justify-content:space-between;align-items:center;gap:8px}.flight-heading h2{font-size:14px;font-weight:600}.flight-heading button{font-size:12px;color:#397d86;min-height:36px}.self-name,.muted{font-size:12px;color:#7a8783;margin:4px 0;line-height:1.6}.flight-cards{margin-top:8px}.identity-choices button{min-height:48px;border:1px solid #dde3de;border-radius:10px;background:white;color:#263331;text-align:left;padding:10px;font-size:12px}.identity-choices button:disabled{opacity:.5}.journey-roster :is(button,input):focus-visible{outline:3px solid #83b3b6;outline-offset:3px}
.departure-guide{margin-top:16px;padding:16px;border:1px solid #dde3de;border-radius:12px;background:#f7f8f6;color:#263331;font-size:12.5px;line-height:1.7}.departure-guide h3{font-size:16px;font-weight:600;margin:0 0 8px}.departure-guide h4{font-size:14px;font-weight:600;margin:14px 0 6px}.counter-script{margin-top:12px;padding:12px;border-left:3px solid #397d86;background:white;border-radius:0 8px 8px 0}.counter-script h4{margin:0 0 5px}.counter-script p{margin:0;line-height:1.7}.departure-guide ol{padding-left:20px;margin:0}.departure-guide li{padding:5px 0}.departure-guide li b{font-weight:600}.guide-sources{margin:12px 0 0;font-size:11.5px;color:#68766f}.guide-sources a{color:#397d86;text-decoration:underline;text-underline-offset:2px}
</style>
