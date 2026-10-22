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
  epoch++; busy.value = false; loaded.value = false; error.value = ''; roster.value = { claims: [], choices: [] }
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
    <div class="flight-heading"><h2>我的航班</h2><button v-if="self" type="button" @click="selecting=!selecting">{{ selecting?'完成選擇':'更改航班' }}</button></div>
    <p v-if="!ready" class="mt-3 text-sm text-stone-600">受邀加入旅程並認領身分後，即可選擇航班。</p>
    <p v-if="error" role="alert" class="mt-3 text-sm text-red-700">{{ error }}</p>
    <p v-if="busy" role="status" class="mt-3 text-sm">正在同步…</p>
    <template v-if="loaded">
      <p v-if="!self" class="mt-3 text-sm text-stone-600">請使用有效邀請連結認領自己的身分。</p>
      <p v-if="self" class="selected-summary">已選 {{myFlights.length}} 段：{{myFlights.map(f=>f.name).join('、') || '尚未選擇'}}</p>
      <p v-if="self" class="self-name">{{ label(self.memberId) }}</p>
      <p v-if="self && !myFlights.length" class="muted">尚未選擇航班，請先選擇自己搭的班次。</p>
      <div class="flight-cards"><JourneyFlightCard v-for="flight in icelandFlights" :key="flight.id" :flight="flight">
        <template v-if="flight.group==='from-iceland'" #reminder><span v-if="flight.id==='ba801'">11/7 Blue Lagoon 與這班航班的銜接待核對；退房、加油、還車及機場抵達時間依實際預約安排。</span><span v-else-if="flight.group==='from-iceland'">加油、還車與機場抵達時間依這班機另行確認。</span></template>
        <p class="muted">同行名單：{{ roster.choices.filter(choice => choice.flightId === flight.id).map(choice => label(choice.memberId)).join('、') || '尚未選擇' }}</p>
        <button v-if="selecting || (self && !myFlights.length)" type="button" :aria-pressed="selected(flight.id)" :disabled="busy || !canEdit || !self" @click="run(() => chooseFlight(tripId,flight.id,!selected(flight.id)))">{{ selected(flight.id)?'取消搭乘':'我搭這班' }}</button>
      </JourneyFlightCard></div>
    </template>
  </section>
</template>

<style scoped>
.journey-roster{min-width:0}.flight-heading{display:flex;justify-content:space-between;align-items:center;gap:8px}.flight-heading h2{font-size:14px;font-weight:600}.flight-heading button{font-size:12px;color:#397d86;min-height:36px}.self-name,.muted{font-size:12px;color:#7a8783;margin:4px 0;line-height:1.6}.flight-cards{margin-top:8px}.identity-choices button{min-height:48px;border:1px solid #dde3de;border-radius:10px;background:white;color:#263331;text-align:left;padding:10px;font-size:12px}.identity-choices button:disabled{opacity:.5}.journey-roster :is(button,input):focus-visible{outline:3px solid #83b3b6;outline-offset:3px}
</style>
