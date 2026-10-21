<script setup lang="ts">
import { locateIcelandRegion } from '@/services/locationService'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { AURORA_CITIES, type AuroraCityId } from '@/domain/auroraConditions'
import { AuroraConditionsService, type AuroraConditions } from '@/services/auroraService'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const expanded = ref(false)
const cityId = ref<AuroraCityId>('reykjavik')
const conditions = ref<AuroraConditions | null>(null)
const locationBusy = ref(false)
const locationMessage = ref('')
async function useLocation() {
  locationBusy.value = true; locationMessage.value = ''
  try {
    const region = await locateIcelandRegion()
    const next = AURORA_CITIES.find(city => city.id === (region.id === 'lagoon' ? 'jokulsarlon' : region.id))
    if (next) { cityId.value = next.id; locationMessage.value = `已選擇最近參考區域：${next.label}。`; await refresh() }
  } catch (error) { locationMessage.value = error instanceof Error ? error.message : '定位失敗，請手動選擇。' }
  finally { locationBusy.value = false }
}
const loading = ref(false)
const errorMessage = ref('')
const clock = ref(Date.now())
const service = new AuroraConditionsService()
let requestId = 0
let clockTimer: ReturnType<typeof setInterval> | undefined

const city = () => AURORA_CITIES.find(candidate => candidate.id === cityId.value) ?? AURORA_CITIES[0]
const dataStale = computed(() => conditions.value != null && clock.value - Date.parse(conditions.value.fetchedAt) >= 30 * 60 * 1000)
const displayAssessment = computed(() => dataStale.value
  ? { label: '資料不足', reason: '資料已過期，請重新整理後再查看今晚條件。' }
  : conditions.value?.assessment)
const bestHour = computed(() => [...(conditions.value?.hours ?? [])]
  .filter(hour => hour.kp != null && hour.cloudCover != null)
  .sort((left, right) => (left.cloudCover! - right.cloudCover!) || (right.kp! - left.kp!))[0] ?? null)
const bestWindow = computed(() => {
  if (!bestHour.value || dataStale.value) return ''
  const start = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(bestHour.value.time) ? bestHour.value.time : `${bestHour.value.time}Z`)
  const sunriseValue = conditions.value?.sunrise
  const sunrise = sunriseValue ? Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(sunriseValue) ? sunriseValue : `${sunriseValue}Z`) : NaN
  const end = Math.min(start + 60 * 60_000, Number.isFinite(sunrise) ? sunrise : Infinity)
  return `${formatHour(bestHour.value.time)}–${formatHour(new Date(end).toISOString())}`
})

function formatHour(value: string): string {
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`
  return new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: city().timeZone }).format(new Date(iso))
}

function formatFetchedAt(value: string): string {
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short', timeZone: city().timeZone }).format(new Date(value))
}

async function refresh(): Promise<void> {
  const currentRequestId = ++requestId
  loading.value = true
  errorMessage.value = ''
  conditions.value = null
  try {
    const nextConditions = await service.load(cityId.value)
    if (currentRequestId === requestId) conditions.value = nextConditions
  } catch (error) {
    if (currentRequestId !== requestId) return
    if (error instanceof DOMException && error.name === 'AbortError') return
    errorMessage.value = error instanceof Error ? error.message : '今晚資料暫時無法讀取。'
  } finally {
    if (currentRequestId === requestId) loading.value = false
  }
}

async function toggle(): Promise<void> {
  expanded.value = !expanded.value
  if (expanded.value && !conditions.value && !loading.value) await refresh()
}

async function changeCity(): Promise<void> {
  await refresh()
}

onMounted(() => {
  clockTimer = setInterval(() => { clock.value = Date.now() }, 60_000)
  void refresh()
})

onBeforeUnmount(() => {
  requestId += 1
  service.dispose()
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<template>
  <section class="aurora-conditions" :class="{ compact }" aria-labelledby="aurora-heading">
    <div class="aurora-conditions__heading"><h2 id="aurora-heading">今晚極光 · {{ city().label }}</h2><span>NOAA / Open-Meteo</span></div>
    <p v-if="loading" class="aurora-conditions__reading" role="status">正在讀取今晚雲量與 Kp…</p>
    <p v-else-if="errorMessage" class="aurora-conditions__reading" role="status">今晚資料暫時無法讀取，請展開詳情重試。</p>
    <template v-else-if="conditions">
      <p class="aurora-conditions__reading">Kp <b>{{ dataStale ? '待更新' : bestHour?.kp ?? '待確認' }}</b> · 雲量 {{ dataStale || bestHour?.cloudCover == null ? '待確認' : `${bestHour.cloudCover}%` }} · <strong>{{ displayAssessment?.label }}</strong>，最佳觀測時段：{{ bestWindow || '資料不足，待確認' }}</p>
      <p class="aurora-conditions__reason">{{ displayAssessment?.reason }}</p>
      <p v-if="conditions.outlook.length" class="aurora-conditions__outlook">未來兩晚：<span v-for="(night,index) in conditions.outlook" :key="night.localDate">{{ index === 0 ? '明晚' : '後晚' }} Kp {{ dataStale ? '待更新' : night.kp ?? '待確認' }}・雲量 {{ dataStale || night.cloudCover == null ? '待確認' : `${night.cloudCover}%` }}<i v-if="index === 0">｜</i></span></p>
    </template>
    <div class="aurora-conditions__footer"><span>{{ conditions ? `更新於 ${formatHour(conditions.fetchedAt)}` : '當晚觀測參考' }}</span><button class="aurora-conditions__toggle" type="button" :aria-expanded="expanded" aria-controls="aurora-details" @click="toggle">{{ expanded ? '收合詳情' : '詳情與提醒' }} {{ expanded ? '▴' : '▾' }}</button></div>
    <div v-if="expanded" id="aurora-details" class="aurora-conditions__body">
      <div class="aurora-conditions__controls"><label>參考地點<select v-model="cityId" :disabled="loading" @change="changeCity"><option v-for="candidate in AURORA_CITIES" :key="candidate.id" :value="candidate.id">{{ candidate.label }}</option></select></label><button type="button" :disabled="loading" @click="refresh">{{ loading ? '讀取中…' : '更新資料' }}</button></div>
      <button type="button" :disabled="locationBusy" @click="useLocation">{{ locationBusy ? '正在定位…' : '使用目前位置' }}</button>
      <p class="aurora-conditions__notice">定位僅選附近參考區域，不保存座標。{{ locationMessage }}</p>
      <slot name="reminders" :city-id="cityId"><p class="aurora-conditions__notice">登入後可設定這部裝置的提醒。</p></slot>
      <p class="aurora-conditions__notice">資料日期 {{ conditions?.localDate || '待確認' }}，以冰島當晚為準，不是整趟旅行的預報。最佳時段採目前資料中雲量較少的完整小時格，仍需現場確認。</p>
      <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
      <template v-if="conditions">
        <p v-if="conditions.sunset && conditions.sunrise" class="aurora-conditions__notice">夜間：{{ formatHour(conditions.sunset) }} 日落至 {{ formatHour(conditions.sunrise) }} 日出</p>
        <ul class="aurora-conditions__hours"><li v-for="hour in conditions.hours.slice(0,6)" :key="hour.time"><span>{{ formatHour(hour.time) }}</span><span>雲量 {{ hour.cloudCover == null ? '待確認' : `${hour.cloudCover}%` }}</span><span>Kp {{ hour.kp ?? '待確認' }}</span></li></ul>
        <p v-if="conditions.errors.length" class="aurora-conditions__notice">部分資料未能讀取：{{ conditions.errors.join('、') }}</p>
        <p class="aurora-conditions__notice">讀取時間：{{ formatFetchedAt(conditions.fetchedAt) }}</p>
        <p class="aurora-conditions__sources">來源：<a :href="conditions.sources.openMeteo" target="_blank" rel="noreferrer">Open-Meteo ↗</a> · <a :href="conditions.sources.noaa" target="_blank" rel="noreferrer">NOAA SWPC ↗</a></p>
      </template>
    </div>
  </section>
</template>
<style scoped>
.aurora-conditions{width:100%;min-width:0;box-sizing:border-box;border-radius:14px;padding:12px 14px;background:var(--iceland-night,#233e49);color:#dcebf0;overflow-wrap:anywhere}
.aurora-conditions *,.aurora-conditions :deep(.aurora-reminders){box-sizing:border-box;min-width:0;max-width:100%}
.aurora-conditions__heading{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:2px 8px}
.aurora-conditions__heading h2{font-size:14px;font-weight:600;color:white;line-height:1.5;margin:0}
.aurora-conditions__heading>span{font-size:11px;color:#9fc3cf}
.aurora-conditions__reading{font-size:13px;line-height:1.6;margin:6px 0 2px}.aurora-conditions__reading :is(b,strong){color:#8fd8b2;font-weight:600}
.aurora-conditions__reason,.aurora-conditions__outlook{font-size:11.5px;color:#9fc3cf;line-height:1.6;margin:0}.aurora-conditions__outlook{margin-top:4px}
.aurora-conditions__outlook i{font-style:normal;margin:0 3px}
.aurora-conditions__footer{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#9fc3cf;font-size:10px;margin-top:4px}
.aurora-conditions__toggle{font-size:11px;color:#dcebf0;min-height:28px;padding:3px 0 3px 8px}
.aurora-conditions__body{margin:8px 0 0;padding:10px;border-radius:10px;background:#f7f8f6;color:#263331;font-size:12px;line-height:1.6}
.aurora-conditions__controls{display:flex;flex-wrap:wrap;align-items:end;gap:8px}.aurora-conditions__controls label{display:grid;flex:1;gap:4px;min-width:min(160px,100%)}
.aurora-conditions__body :is(button,select){min-height:40px;border:1px solid #d9e1dc;border-radius:8px;background:white;color:#397d86;padding:6px 10px;font:inherit;white-space:normal;overflow-wrap:anywhere}.aurora-conditions select{width:100%}.aurora-conditions__body>button{margin-top:8px}.aurora-conditions__body button:disabled{opacity:.5}
.aurora-conditions__notice,.aurora-conditions__sources{font-size:11px;line-height:1.6;color:#62766d;margin:8px 0}.aurora-conditions__sources a{color:#397d86;text-decoration:underline}
.aurora-conditions :deep(.aurora-reminders){padding:10px;margin-top:10px}.aurora-conditions :deep(.aurora-reminders button){white-space:normal;overflow-wrap:anywhere}
.aurora-conditions__hours{margin:8px 0;padding:0;list-style:none}.aurora-conditions__hours li{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr) minmax(0,.7fr);gap:6px;border-bottom:1px solid #dde3de;padding:5px 0;font-size:11px;color:#62766d}
.aurora-conditions :is(button,select,a):focus-visible{outline:3px solid #83b3b6;outline-offset:3px}
</style>
