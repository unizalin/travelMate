<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { solarTimes } from '@/domain/solarTimes'
import { clothingAdvice, equipmentForActivities, weatherRegionsForDate } from '@/domain/tripWeather'
import { dayOutfitByDate } from '@/data/dayOutfits'
import { locateIcelandRegion } from '@/services/locationService'
import type { WeatherRegion } from '@/domain/tripWeather'
import { loadDayForecast, type DayForecastResult } from '@/services/tripWeatherService'

const props = defineProps<{ date: string; activityNames: string[] }>()
const located = ref<WeatherRegion | null>(null)
const locationBusy = ref(false)
const locationMessage = ref('')
const regions = computed(() => {
  const routeRegions = weatherRegionsForDate(props.date)
  return located.value && !routeRegions.some(region => region.id === located.value?.id) ? [...routeRegions, located.value] : routeRegions
})
async function useLocation() {
  locationBusy.value = true; locationMessage.value = ''
  try {
    const next = await locateIcelandRegion()
    located.value = next; regionId.value = next.id
    locationMessage.value = `已使用目前位置附近的參考區域：${next.label}。`
  } catch (error) { locationMessage.value = error instanceof Error ? error.message : '定位失敗，仍可手動選地區。' }
  finally { locationBusy.value = false }
}
const regionId = ref('')
watch(() => props.date, () => { regionId.value = regions.value[0]?.id ?? '' }, { immediate: true })
const region = computed(() => regions.value.find(candidate => candidate.id === regionId.value))
const state = ref<DayForecastResult | { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'unknown-region' }>({ kind: 'loading' })
const clock = ref(Date.now())
const stale = computed(() => (state.value.kind === 'forecast' || state.value.kind === 'unavailable') && clock.value - Date.parse(state.value.fetchedAt) >= 30 * 60_000)
const forecast = computed(() => state.value.kind === 'forecast' && !stale.value ? state.value.day : null)
const advice = computed(() => dayOutfitByDate[props.date] ?? (forecast.value ? clothingAdvice(forecast.value) : null))
const equipment = computed(() => equipmentForActivities(props.activityNames))
const solar = computed(() => region.value ? solarTimes(props.date,region.value.latitude,region.value.longitude) : null)
const daylight = computed(() => {
  const day = forecast.value
  if (!day?.sunrise || !day.sunset) return ''
  const minutes = Math.round((Date.parse(`${day.sunset}Z`) - Date.parse(`${day.sunrise}Z`)) / 60000)
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) return ''
  return `白天 ${Math.floor(minutes / 60)} 小時${minutes % 60 ? ` ${minutes % 60} 分` : ''}`
})
const updated = computed(() => state.value.kind === 'forecast' || state.value.kind === 'unavailable' ? new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik' }).format(new Date(state.value.fetchedAt)) : '')
let controller: AbortController | undefined
let request = 0
let timer: ReturnType<typeof setInterval> | undefined
const cache = new Map<string, DayForecastResult>()
function updateClock() { clock.value = Date.now() }
async function refresh(force = false) {
  const current = ++request
  controller?.abort()
  updateClock()
  const selected = region.value
  if (!selected) { state.value = { kind: 'unknown-region' }; return }
  const key = `${props.date}/${selected.id}`
  const cached = cache.get(key)
  if (!force && cached && clock.value - Date.parse(cached.fetchedAt) < 30 * 60_000) { state.value = cached; return }
  state.value = { kind: 'loading' }
  controller = new AbortController()
  try {
    const result = await loadDayForecast({ date: props.date, region: selected, signal: controller.signal })
    if (current !== request) return
    cache.set(key, result)
    state.value = result
    updateClock()
  } catch (error) {
    if (current !== request) return
    state.value = { kind: 'error', message: error instanceof Error ? error.message : '天氣資料暫時無法讀取，請重試。' }
  }
}
watch([() => props.date, region], () => { void refresh() }, { immediate: true })
onMounted(() => { timer = setInterval(updateClock, 60_000); window.addEventListener('focus', updateClock) })
onBeforeUnmount(() => { request++; controller?.abort(); if (timer) clearInterval(timer); window.removeEventListener('focus', updateClock) })
function value(number: number | null, unit: string) { return number == null ? '暫無資料' : `${Math.round(number * 10) / 10}${unit}` }
function range(min: number | null, max: number | null) { return min == null || max == null ? '暫無資料' : `${Math.round(min)}–${Math.round(max)}°C` }
</script>

<template>
<section aria-label="天氣與出門準備" class="day-conditions">
  <p class="weather-line"><b>{{ region?.label || '當日地區' }}</b><template v-if="forecast"><span>· {{ range(forecast.temperatureMin,forecast.temperatureMax) }}</span><span>· 雨 {{ value(forecast.precipitationProbability,'%') }}</span><span>· 風 {{ value(forecast.wind,' m/s') }}</span></template><span v-else>· {{ state.kind==='loading' ? '讀取預報中…' : stale ? '預報已過期' : state.kind==='error' ? '預報暫時無法讀取' : '預報尚未提供' }}</span><template v-if="solar"><span>· 日出 {{ solar.sunrise || '待確認' }}</span><span>· 日落 {{ solar.sunset || '待確認' }}</span><span>· 藍調 {{ solar.morning.join('–') }}／{{ solar.evening.join('–') }}</span></template></p>
  <slot name="after-weather" />
  <p class="outfit"><b>今日穿搭</b> {{ advice || '當日預報可用後更新；先穿保暖分層與防風防水外層。' }}</p>
  <details class="weather-details"><summary>天氣、日照與裝備詳情 <span v-if="updated">· 更新於 {{ updated }}</span></summary>
    <slot name="checks" />
    <p v-if="stale" role="status">資料超過 30 分鐘，請更新後再看預報建議。</p><p v-else-if="state.kind==='error'" role="alert">{{ state.message }}</p><p v-else-if="state.kind==='unavailable'">來源尚未提供這一天的預報，不套用其他日期的天氣。</p>
    <p v-if="forecast">體感 {{ range(forecast.apparentMin,forecast.apparentMax) }} · 陣風 {{ value(forecast.gusts,' m/s') }} · 降水 {{ value(forecast.precipitation,' mm') }} · 雪量 {{ value(forecast.snowfall,' cm') }} · {{ daylight }}</p>
    <p>日照依當日參考區域座標計算；藍調採太陽高度 −6° 至 −4°，不代表現場能見度。遠期預報出發前再確認。</p>
    <label class="day-conditions__region">查看地區<select v-model="regionId" aria-label="天氣參考地區"><option v-for="option in regions" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>
    <button type="button" :disabled="locationBusy" @click="useLocation">{{ locationBusy ? '正在定位…' : '使用目前位置' }}</button><button type="button" :disabled="state.kind==='loading'" @click="refresh(true)">更新天氣</button>
    <p v-if="locationMessage" role="status">{{ locationMessage }}</p><p>定位只選附近冰島地區，不保存座標或持續追蹤。</p>
    <ul><li v-for="tip in equipment" :key="tip">{{ tip }}</li></ul><p>一般準備建議，活動裝備以業者通知為準。</p>
    <a href="https://en.vedur.is/" target="_blank" rel="noreferrer">Veður ↗</a> · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · <a href="https://safetravel.is/" target="_blank" rel="noreferrer">SafeTravel ↗</a>
  </details>
</section>
</template>
<style scoped>
.day-conditions{min-width:0;margin-top:6px;color:var(--iceland-ink,#263331)}
.weather-line{display:flex;flex-wrap:wrap;align-items:center;gap:2px 6px;margin:0;color:#39544e;background:#eef4f1;border-radius:9px;padding:6px 10px;font-size:12px;line-height:1.55}
.weather-line b{color:#263331;font-weight:600;white-space:nowrap}
.weather-line span{white-space:nowrap}
.outfit{margin:6px 0 0;color:#7a8783;background:white;border:1px solid #dde3de;border-radius:9px;padding:6px 10px;font-size:12px;line-height:1.55}
.outfit b{margin-right:5px;color:#397d86;font-weight:600}
.weather-details{margin-top:6px;border-top:1px solid var(--iceland-line,#d9e1dc);padding-top:4px;color:#7a8783;font-size:12px;line-height:1.7}
.weather-details>summary{display:flex;min-height:36px;flex-wrap:wrap;align-items:center;gap:4px;cursor:pointer;list-style:none;font-size:11px}
.weather-details>summary::after{content:'▾'}
.weather-details[open]>summary::after{content:'▴'}
.weather-details button{min-height:44px;padding:5px 12px;color:#397d86}
.weather-details p{margin:7px 0}
.weather-details ul{margin:8px 0;padding-left:18px}
.weather-details li+li{margin-top:5px}
.weather-details a{color:#397d86;text-decoration:underline;text-underline-offset:3px}
.day-conditions__region{display:flex;align-items:center;gap:10px;margin-top:8px;color:#526b65;font-size:12px}
.day-conditions select{min-width:0;min-height:44px;flex:1;border:1px solid #c8d9d3;border-radius:8px;padding:6px;background:white;color:#263331;font:inherit}
.day-conditions :is(button,select,a,summary):focus-visible{outline:3px solid #83b3b6;outline-offset:3px}
</style>
