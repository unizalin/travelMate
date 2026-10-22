<script setup lang="ts">
import { ICELAND_TRAVEL_MAP_URL } from '@/data/icelandTravelMap'
import { computed, onMounted, onUnmounted, provide, ref, useSlots, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { buildDailyTimeline, type DailyTimeline, type TripJourney } from '@/domain/tripJourney'
import { tripOpeningDate } from '@/domain/tripOpeningDate'
import { icelandFlights } from '@/data/icelandFlights'
import { publicIcelandJourney } from '@/data/icelandPublic'
import { publicLondonJourney } from '@/data/londonPublic'
import { icelandTrip } from '@/data/icelandTrip'
import { icelandDailyPace } from '@/data/icelandDailyPace'
import { CalendarDaysIcon, PaperAirplaneIcon, ClipboardDocumentCheckIcon, UserCircleIcon } from '@heroicons/vue/24/outline'
import PhotographySpots from './PhotographySpots.vue'
import { photographyWeatherKey } from './photographyContext'
import type { PhotographyWeather } from '@/domain/photographyAdvice'
import JourneyClocks from './JourneyClocks.vue'
import ItineraryDates from './ItineraryDates.vue'
import LondonItinerary from './LondonItinerary.vue'
import ItineraryActivity from './ItineraryActivity.vue'
import DayConditions from '@/components/trip/DayConditions.vue'
import AuroraConditions from '@/components/trip/AuroraConditions.vue'
import { handbookDays } from '@/data/icelandHandbook'
import { publicDayServices, publicNavTerm, publicServiceMapsUrl, publicStopService } from '@/data/publicDayExtras'
import { loadVedurAlerts, type VedurAlert } from '@/services/vedurAlertService'
import VedurAlertBanner from './VedurAlertBanner.vue'

const emit = defineEmits<{ 'select-section': [section: string]; 'select-date': [date: string] }>()

const props = withDefaults(defineProps<{
  journey?: TripJourney
  publicOnly?: boolean
  companionMode?: boolean
  section?: string
  auroraRequest?: string
}>(), {
  journey: () => publicIcelandJourney,
  publicOnly: true,
  companionMode: false,
})

function navigateViews(event: KeyboardEvent) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!keys.includes(event.key)) return
  event.preventDefault()
  const index = readerViews.value.findIndex(view => view.id === activeView.value)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? readerViews.value.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + readerViews.value.length) % readerViews.value.length
  selectView(readerViews.value[next].id)
  document.getElementById(`view-tab-${activeView.value}`)?.focus()
}
const slots = useSlots()
const hasLondon = computed(() => props.publicOnly || Boolean(slots.prelude))
const vedurAlerts = ref<VedurAlert[]>([])
const vedurNow = ref(Date.now())
const alertAbort = new AbortController()
let alertRefreshTimer: ReturnType<typeof setInterval> | undefined
let alertClockTimer: ReturnType<typeof setInterval> | undefined
const currentVedurAlerts = computed(() => vedurAlerts.value.filter(alert => Date.parse(alert.startsAt) <= vedurNow.value && vedurNow.value < Date.parse(alert.endsAt)).slice(0, 3))
async function refreshVedurAlerts() {
  const result = await loadVedurAlerts({ signal: alertAbort.signal })
  if (alertAbort.signal.aborted) return
  vedurNow.value = Date.now()
  vedurAlerts.value = result.alerts
}
onMounted(() => {
  void refreshVedurAlerts()
  alertRefreshTimer = setInterval(() => { void refreshVedurAlerts() }, 10 * 60 * 1000)
  alertClockTimer = setInterval(() => { vedurNow.value = Date.now() }, 60 * 1000)
})
onUnmounted(() => {
  alertAbort.abort()
  clearInterval(alertRefreshTimer)
  clearInterval(alertClockTimer)
})
const selectedDate = ref('')
let touchX=0,touchY=0
function touchStart(event: TouchEvent) { touchX=event.changedTouches[0].clientX; touchY=event.changedTouches[0].clientY }
function touchEnd(event: TouchEvent) { if(event.target instanceof Element && event.target.closest('input,textarea,button,a,.drag-handle')) return; const dx=event.changedTouches[0].clientX-touchX,dy=event.changedTouches[0].clientY-touchY; if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.5) { const index=legDays.value.findIndex(day=>day.date===selectedDate.value)+(dx<0?1:-1); if(legDays.value[index]) selectedDate.value=legDays.value[index].date } }

const activeView = ref('daily')
const readerViews = computed(() => [
  { id: 'daily', label: '行程', icon: CalendarDaysIcon },
  { id: 'flights', label: '我的航班', icon: PaperAirplaneIcon },
  { id: 'more', label: '行前準備', icon: ClipboardDocumentCheckIcon },
  { id: 'me', label: '我的', icon: UserCircleIcon },
])
watch(() => [props.section, props.publicOnly], () => {
  const section = props.section
  activeView.value = !props.publicOnly && (section === 'flights' || section === 'more' || section === 'me') ? section : 'daily'
}, { immediate: true })
function selectView(view: string) {
  activeView.value = view
  emit('select-section', view === 'daily' ? 'itinerary' : view)
  document.querySelector('.journey-header')?.scrollIntoView?.({ block: 'start' })
}
const dailyFlights = computed(() => icelandFlights.filter(f => f.date === selectedDay.value?.date && ['to-iceland', 'from-iceland'].includes(f.group)))


const timeline = computed<DailyTimeline[]>(() => props.publicOnly ? [...buildDailyTimeline(publicLondonJourney).filter(day => day.date < '2026-10-30'), ...buildDailyTimeline(publicIcelandJourney).filter(day => day.date >= '2026-10-30')] : buildDailyTimeline(props.journey))
const days = computed(() => timeline.value.filter(day => day.events.some(event => event.type === 'item' || event.type === 'transport')))
const activeLeg = ref<'london' | 'iceland'>('london')
watch(() => props.auroraRequest, value => { if(value && !props.publicOnly) selectLeg('iceland') })
onMounted(()=>{if(props.auroraRequest && !props.publicOnly)selectLeg('iceland')})
const legDays = computed(() => days.value.filter(day => activeLeg.value === 'london' ? day.date < '2026-10-30' : day.date >= '2026-10-30'))
function selectLeg(leg: 'london' | 'iceland') {
  activeLeg.value = leg
  selectedDate.value = legDays.value[0]?.date ?? ''
}
const selectedDay = computed(() => days.value.find(day => day.date === selectedDate.value) ?? days.value[0] ?? null)
const selectedIsLondon = computed(() => Boolean(selectedDay.value && selectedDay.value.date < '2026-10-30'))
const photographyWeather = ref<PhotographyWeather | null>(null)
provide(photographyWeatherKey, computed(() => photographyWeather.value?.day.date === selectedDay.value?.date ? photographyWeather.value : null))
watch(selectedDate, () => { photographyWeather.value = null }, { flush: 'sync' })
watch(selectedDay, day => { if (day) emit('select-date', day.date) }, { immediate: true })
const selectedPlanB = computed(() => props.publicOnly && selectedDay.value ? icelandDailyPace[selectedDay.value.date] : undefined)
const selectedEvents = computed(() => selectedDay.value?.events.filter(event => !props.publicOnly || (event.type !== 'accommodation' && event.type !== 'transport')) ?? [])
/** Public list follows the confirmed itinerary order (item.order); the shared
 * timeline sorts timed events first, which moved Reynisfjara ahead of
 * Dyrhólaey on 11/2 — the confirmed order is Dyrhólaey before Reynisfjara. */
const publicActivities = computed(() => selectedEvents.value.flatMap(event => {
  const item = event.item
  if (!item) return []
  return [{ id: item.id, date: item.date, name: item.name, location: item.location, order: item.order, plannedStart: item.plannedStart, plannedEnd: item.plannedEnd, actualStart: null, actualEnd: null, status: item.status, photoTip: item.photoTip, reminder: item.reminder ?? null, notes: [item.location, item.notes || null, icelandTrip.suppliedOpeningHours[item.id] ? `提供的營業時間：${icelandTrip.suppliedOpeningHours[item.id]}` : null].filter(Boolean).join(' · ') }]
}).sort((left, right) => left.order - right.order))
const flights = computed(() => props.journey.transports.filter(transport => transport.kind === 'flight'))

watch(days, nextDays => {
  if (!nextDays.some(day => day.date === selectedDate.value)) selectedDate.value = tripOpeningDate(nextDays.map(day => day.date))
  activeLeg.value = selectedDate.value < '2026-10-30' ? 'london' : 'iceland'
}, { immediate: true })

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('zh-TW', { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

function dayNumber(date: string): string {
  return String(legDays.value.findIndex(day => day.date === date) + 1).padStart(2, '0')
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    planned: '照行程',
    next: '下一站',
    completed: '已完成',
    skipped: '略過',
    cancelled: '已取消',
    fallback: '備案',
  }
  return labels[status] ?? status
}

function eventLabel(event: NonNullable<DailyTimeline['events']>[number]): string {
  if (event.type === 'transport') {
    if (event.transportPhase === 'arrival') return `抵達 ${event.transport?.arrival.location ?? '地點待確認'}`
    return `${event.transport?.departure.location ?? ''} → ${event.transport?.arrival.location ?? ''}`
  }
  return event.location ?? '地點待確認'
}

function flightTime(flight: (typeof flights.value)[number]): string {
  const departure = flight.departure.localTime ?? '待確認'
  const arrival = flight.arrival.localTime ?? '待確認'
  return `${departure} → ${arrival}`
}
</script>

<template>
  <main class="trip-reader iceland-reader min-h-screen" :class="{nonmember:publicOnly}">
    <header class="journey-header">
      <div class="site-header-row"><div class="site-brand">travelmate<span>.</span></div>      <div role="tablist" aria-label="旅程檢視" v-if="!publicOnly" class="journey-navigation">
        <button v-for="view in readerViews" :id="`view-tab-${view.id}`" :key="view.id" role="tab" type="button" :tabindex="activeView === view.id ? 0 : -1" @keydown="navigateViews" :aria-selected="activeView === view.id" :aria-current="activeView === view.id ? 'page' : undefined" :aria-controls="`view-${view.id === 'more' ? 'preparation' : view.id}`" class="min-h-11 rounded-xl px-4 py-2 text-sm font-bold" :class="activeView === view.id ? 'bg-[var(--iceland-action)] text-white' : 'bg-stone-100 text-stone-600'" @click="selectView(view.id)"><component :is="view.icon" aria-hidden="true" />{{ view.label }}</button>
      </div><div class="account-actions"><slot name="header-actions" /></div></div>
      <div class="journey-header__inner mx-auto max-w-6xl">
        <div class="brand-row"><p>{{ hasLondon ? 'LONDON · ICELAND · 2026' : 'ICELAND · 2026' }}</p></div>
        <h1 v-if="activeView==='daily'" class="journey-title">{{ hasLondon ? '一起去倫敦・冰島' : '一起去冰島' }} <small>{{ hasLondon ? '10/24–11/7 · 15 天 · 6 人' : '10/30–11/7 · 9 天 · 6 人' }}</small></h1>
        <h1 v-if="activeView!=='daily'" class="journey-title">{{readerViews.find(view=>view.id===activeView)?.label}}</h1>
        <div v-if="slots['header-notice']" class="header-notice"><slot name="header-notice" /></div>
      </div>
    </header>

    <div class="journey-content mx-auto max-w-6xl">
      <div class="global-information">
        <VedurAlertBanner :alerts="currentVedurAlerts" />
        <template v-if="activeView === 'daily'">
          <slot v-if="!selectedIsLondon" name="global-information"><AuroraConditions v-if="!selectedIsLondon && !companionMode" compact /></slot>
          <JourneyClocks :region="selectedIsLondon ? 'london' : 'iceland'" />
        </template>
      </div>

      <section v-if="activeView === 'daily'" id="view-daily" role="tabpanel" aria-labelledby="view-tab-daily" class="daily-content">
        <div @touchstart.passive="touchStart" @touchend.passive="touchEnd">
        <div v-if="hasLondon" class="journey-legs" role="tablist" aria-label="旅程切換">
          <button id="leg-tab-london" type="button" role="tab" :aria-selected="activeLeg === 'london'" :tabindex="activeLeg === 'london' ? 0 : -1" @click="selectLeg('london')">倫敦前段 <small>10/24–10/29</small></button>
          <button id="leg-tab-iceland" type="button" role="tab" :aria-selected="activeLeg === 'iceland'" :tabindex="activeLeg === 'iceland' ? 0 : -1" @click="selectLeg('iceland')">冰島九天 <small>10/30–11/7</small></button>
        </div>
        <div class="date-toolbar"><span>{{selectedIsLondon ? '倫敦' : '冰島'}}行程日期</span><button type="button" @click="selectedDate=tripOpeningDate(days.map(day=>day.date));activeLeg=selectedDate<'2026-10-30'?'london':'iceland'">回到今天</button></div>
        <ItineraryDates v-model="selectedDate" :dates="legDays.map(day => day.date)" />
        <div :id="selectedDay ? `day-panel-${selectedDay.date}` : undefined" role="tabpanel" :aria-labelledby="selectedDay ? `day-tab-${selectedDay.date}` : undefined">

        <h2 v-if="selectedDay && !selectedIsLondon" class="daily-heading">{{ formatDate(selectedDay.date) }} · Day {{ dayNumber(selectedDay.date) }}</h2>
        <LondonItinerary v-if="selectedIsLondon && publicOnly" :journey="publicLondonJourney" :date="selectedDate" embedded />
        <slot v-else-if="selectedIsLondon" name="prelude" :date="selectedDate" />
        <template v-else>
        <slot name="route-summary"><p v-if="selectedDay" class="route-line">{{ publicActivities.filter(item => item.status !== 'fallback').map(item => item.name).join(' → ') }}</p></slot>
        <DayConditions v-if="selectedDay" @photography-weather="photographyWeather=$event" :date="selectedDay.date" :activity-names="selectedDay.events.filter(event => event.type === 'item').map(event => event.name)">
          <template #after-weather><p v-if="publicOnly && selectedDay && handbookDays[selectedDay.date]" class="practical-line"><b>沿途實用</b> {{ handbookDays[selectedDay.date].fuel }} · 廁所請於遊客中心或停車場確認開放 · <a href="https://umferdin.is/en" target="_blank" rel="noreferrer">查看即時路況 ↗</a> · <a :href="ICELAND_TRAVEL_MAP_URL" target="_blank" rel="noreferrer">冰島旅行資料庫（Google 地圖） ↗</a></p><p v-if="selectedDay && publicDayServices[selectedDay.date]" class="services-line"><b>沿途服務</b><a v-for="service in publicDayServices[selectedDay.date]" :key="`${service.kind}-${service.label}`" :href="publicServiceMapsUrl(service.query)" target="_blank" rel="noreferrer">{{ service.kind === 'fuel' ? '加油' : '廁所' }}：{{ service.label }} ↗</a></p><slot name="day-practical" /></template>
          <template #checks><slot name="daily-start" /></template>
        </DayConditions>
        <slot name="day-content">
        <details v-if="selectedPlanB" class="public-plan-b" aria-label="今日應變"><summary>Plan B</summary>
          <b>應變</b>
          <span><strong>保住</strong> {{ selectedPlanB.keep }} <i aria-hidden="true">｜</i> <strong>先刪</strong> {{ selectedPlanB.skip }}</span>
        </details>

        <div v-if="publicOnly && dailyFlights.length" class="daily-flight-options" aria-label="當日航班方案">
          <p v-for="flight in dailyFlights" :key="flight.id"><b>{{ flight.name }} · {{ flight.from }} → {{ flight.to }}</b> · {{ flight.departure }}–{{ flight.arrival }}</p>
          <small>起降當地時間 · 加入後可選擇自己的航班。</small>
        </div>
        <ol v-if="publicOnly && selectedDay" class="public-activities"><ItineraryActivity v-for="(item,index) in publicActivities" :key="item.id" :item="item" :index="index" :next="item.status === 'next'" :navigation-term="publicNavTerm(item.name)" :facility-label="publicStopService(item.name)?.label" :facility-query="publicStopService(item.name)?.query"><template #photography><PhotographySpots :item="{...item,photoSpots:publicIcelandJourney.items.find(source=>source.id===item.id)?.photoSpots}" /></template></ItineraryActivity></ol>
        <div v-else-if="selectedDay" class="mt-4 space-y-3">
          <article v-for="event in selectedEvents" :key="event.id" class="reader-event" :class="event.type === 'transport' ? 'border-l-4 border-l-amber-400' : ''">
            <div class="flex gap-4">
              <div class="reader-event__number">
                <span v-if="event.type === 'transport'" aria-hidden="true">✈</span>
                <span v-else-if="event.type === 'accommodation'" aria-hidden="true">⌂</span>
                <span v-else class="text-sm font-black">{{ event.item?.order }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 class="mt-1 text-base font-bold text-slate-900 sm:text-lg">{{ event.name }}</h3>
                  </div>
                  <span v-if="event.item && event.item.status !== 'planned'" class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{{ statusLabel(event.item.status) }}</span>
                </div>
                <p v-if="event.type === 'transport' && event.transport" class="mt-2 text-sm font-semibold text-amber-800">{{ event.transport.name }}<span v-if="event.transportPhase !== 'arrival'"> · {{ flightTime(event.transport) }}</span><span v-else> · 抵達 {{ event.transport.arrival.location }}</span></p>
                <p v-else class="mt-2 text-sm text-slate-500">{{ eventLabel(event) }}</p>
                <p v-if="event.item?.plannedStart" class="mt-2 text-sm font-semibold text-stone-700">已確認時段 · {{ event.item.plannedStart.slice(11, 16) }}–{{ event.item.plannedEnd?.slice(11, 16) }}（當地時間）</p>
                <p v-if="publicOnly && icelandTrip.suppliedOpeningHours[event.id]" class="mt-2 text-xs text-stone-500">提供的營業時間：{{ icelandTrip.suppliedOpeningHours[event.id] }}</p>
                <p v-if="!publicOnly && event.item?.notes" class="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">{{ event.item.notes }}</p>
                <p v-if="!publicOnly && event.item?.photoTip" class="mt-3 text-xs leading-5 text-[var(--iceland-glacier)]"><span class="font-bold">拍攝提示：</span>{{ event.item.photoTip }}</p>
                <p v-if="event.type === 'transport' && event.transport?.notes && !publicOnly" class="mt-3 text-xs leading-5 text-slate-500">{{ event.transport.notes }}</p>
                <p v-if="event.pendingParticipation" class="mt-3 text-xs font-semibold text-amber-700">參與者待確認</p>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="mt-4 rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">行程日期尚待建立。</p>
        </slot>
        </template>
        </div>
        </div>
        <slot v-if="!publicOnly" name="daily-footer" />
      </section>

      <section v-if="!publicOnly && activeView === 'me'" id="view-me" role="tabpanel" aria-labelledby="view-tab-me"><slot name="me" /></section>
      <section v-if="!publicOnly && activeView === 'more'" id="view-preparation" role="tabpanel" aria-labelledby="view-tab-more" class="preparation-content">
        <slot v-if="!publicOnly" name="preparation" />

      </section>

      <div v-if="!publicOnly && activeView === 'flights'" class="flight-section" id="view-flights">
      <slot name="flights">


      <section v-if="!publicOnly" role="tabpanel" aria-labelledby="view-tab-flights" class="mt-12">
        <div class="flex items-end justify-between gap-4">
          <div>
          <p class="airbnb-section-kicker text-[11px] font-bold uppercase tracking-[.22em]">Open passenger binding</p>
            <h2 id="flight-heading" class="mt-1 text-2xl font-black tracking-tight text-slate-900">航班</h2>
          </div>
          <span class="text-xs text-slate-400">乘客待確認</span>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <article v-for="flight in flights" :key="flight.id" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(22,54,54,.05)]">
            <div class="flex items-center justify-between gap-3">
              <span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{{ flight.name }}</span>
              <span class="text-xs text-slate-400">{{ formatDate(flight.departure.localDate) }}</span>
            </div>
            <p class="mt-4 text-lg font-black text-slate-900">{{ flight.departure.location }} <span class="px-1 text-slate-300">→</span> {{ flight.arrival.location }}</p>
            <p class="mt-1 text-sm text-slate-500">{{ flightTime(flight) }} · 當地時間</p>
          </article>
        </div>
      </section>

      </slot>
      </div>
      <div v-if="activeView === 'daily'"><slot name="sync-settings" /></div>

      <div v-if="!publicOnly && !companionMode" class="mt-12 rounded-3xl border border-teal-200 bg-[var(--iceland-mist)] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p class="text-sm font-bold text-teal-950">想一起修改行程？</p>
          <p class="mt-1 text-xs leading-5 text-[var(--iceland-glacier)]">規劃資料會先保存在這個帳號的裝置，也可以使用雲端草稿協作。</p>
        </div>
        <RouterLink :to="{ name: 'iceland-planner', params: { tripId: props.journey.tripId } }" class="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-teal-900 px-5 text-sm font-bold text-white transition hover:bg-[var(--iceland-action)] sm:mt-0">開啟規劃</RouterLink>
      </div>

      <p v-if="!companionMode" class="mt-12 text-center text-xs leading-5 text-slate-400">此頁提供行程、日期、地點與航班摘要；加入後可選擇航班、共同編輯。</p>
    </div>
  </main>
</template>

<style scoped>
.iceland-reader {
  --iceland-snow: #f7f8f6;
  --iceland-paper: #ffffff;
  --iceland-ink: #263331;
  --iceland-glacier: #397d86;
  --iceland-action: #263331;
  --iceland-moss: #e5ebdf;
  --iceland-lava: #c76b46;
  --iceland-muted: #7a8783;
  --iceland-line: #dde3de;
  --iceland-mist: #edf3f1;
  --iceland-night: #233e49;
  background: var(--iceland-snow);
  color: var(--iceland-ink);
  font-family: -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.iceland-reader ::selection { background: #cee3df; }
.journey-header { background: var(--iceland-snow); }
.journey-header__inner { max-width: 960px; padding: 14px 18px 8px; }
.global-information { max-width: 960px; margin-top: 2px; margin-bottom: 8px; }.global-information:empty { display: none; }
.aurora-placeholder { display: grid; gap: 3px; padding: 10px 13px; margin: 8px 0 2px; border-radius: 12px; background: var(--iceland-night); color: #dcebf0; font-size: 11.5px; line-height: 1.5; }
.aurora-placeholder b { color: #fff; font-size: 13px; }
.header-notice { max-width: 100%; margin-top: 6px; overflow-wrap: anywhere; }
.header-notice:empty { display: none; }
.header-notice :deep(p) { max-width: 100%; margin: 0; font-size: 12px; line-height: 1.5; }
.public-plan-b { display: flex; gap: 8px; margin: 8px 0 0; color: var(--iceland-muted); font-size: 12px; line-height: 1.55; }
.public-plan-b > b, .public-plan-b strong { color: var(--iceland-ink); font-weight: 600; white-space: nowrap; }
.public-plan-b i { color: #a4aaa5; font-style: normal; }
.practical-line { margin: 6px 0 0; background: #fff; border: 1px solid var(--iceland-line); border-radius: 9px; padding: 6px 10px; font-size: 12px; line-height: 1.55; color: var(--iceland-muted); }
.practical-line b { color: var(--iceland-glacier); font-weight: 600; margin-right: 5px; }
.practical-line a { color: var(--iceland-glacier); font-weight: 600; }
.services-line { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 7px; margin: 6px 0 0; background: #fff; border: 1px solid var(--iceland-line); border-radius: 9px; padding: 6px 10px; font-size: 12px; line-height: 1.55; color: var(--iceland-muted); }
.services-line b { color: var(--iceland-glacier); font-weight: 600; margin-right: 1px; }
.services-line a { color: var(--iceland-ink); font-weight: 500; text-decoration: none; border: 1px solid var(--iceland-line); border-radius: 999px; padding: 1px 9px; background: var(--iceland-mist); }
.brand-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.brand-row > p { font-family: "Avenir Next", "Helvetica Neue", sans-serif; font-size: 12px; letter-spacing: .18em; color: var(--iceland-glacier); font-weight: 700; }
.journey-title { margin: 6px 0 2px; font-size: 19px; line-height: 1.5; font-weight: 700; letter-spacing: 0; }
.journey-title small { color: var(--iceland-muted); font-size: 12.5px; font-weight: 400; margin-left: 6px; }
.journey-title span { color: var(--iceland-glacier); margin-left: .12em; }
.journey-header__inner > p { color: var(--iceland-muted); }
.journey-content { max-width: 960px; padding: 0 18px 28px; }
.journey-navigation { display: flex; margin: 0; background: var(--iceland-snow); padding: 6px 0 0; gap: 6px; }
.journey-navigation button { flex: 1; min-height: 42px; padding: 9px 0; border-radius: 11px; font-size: 13.5px; white-space: nowrap; }
.journey-navigation [role="tab"] { flex: 1; min-width: 0; white-space: nowrap; background: transparent; border-radius: 11px; color: var(--iceland-muted); font-weight: 500; }
.journey-navigation [role="tab"][aria-selected="true"] { background: var(--iceland-ink); color: white; font-weight: 600; }
.journey-legs { display: flex; gap: 3px; padding: 3px; margin-top: 10px; border-radius: 11px; background: var(--iceland-moss); }
.journey-legs button { flex: 1; min-width: 0; min-height: 44px; padding: 7px 8px; border-radius: 8px; color: var(--iceland-muted); font-size: 13px; font-weight: 600; }
.journey-legs button[aria-selected="true"] { background: #fff; color: var(--iceland-ink); box-shadow: 0 1px 3px rgba(38,51,49,.12); }
.journey-legs small { display: block; font-size: 10.5px; font-weight: 400; line-height: 1.4; }
.preview-alternatives { margin-top: 12px; border-top: 1px solid var(--iceland-line); color: var(--iceland-muted); font-size: 12px; line-height: 1.6; }
.preview-alternatives summary { min-height: 42px; padding: 10px 0; color: var(--iceland-ink); font-weight: 600; cursor: pointer; }
.preview-alternatives a { display: block; margin: 5px 0; color: var(--iceland-glacier); }
.iceland-reader h2 { font-size: 23px; line-height: 1.4; font-weight: 600; letter-spacing: -.035em; color: var(--iceland-ink); }
.airbnb-section-kicker { color: var(--iceland-glacier); font-size: 10px; letter-spacing: .12em; }
.daily-content { margin-top: 0; }.preparation-content,.flight-section { padding-top: 22px; scroll-margin-top: 8px; }.public-preparation-card,.private-stays{background:#fff;border:1px solid var(--iceland-line);border-radius:14px;padding:12px 14px;margin:0 0 14px}.public-preparation-card h2,.private-stays h2{font-size:14px;font-weight:600;margin:0 0 8px}.public-preparation-card p{font-size:12.5px;line-height:1.6;margin:4px 0}.public-preparation-card a{color:var(--iceland-glacier);font-weight:600}.private-stay{display:flex;justify-content:space-between;gap:8px;border-top:1px dashed var(--iceland-line);padding:6px 0;font-size:12.5px;line-height:1.5}.private-stay:first-of-type{border-top:0}.private-stay span{color:var(--iceland-muted);text-align:right;white-space:nowrap}
.route-notices { margin-top: 12px; border-bottom: 1px solid var(--iceland-line); font-size: 13px; }
.route-notices summary { display: flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer; font-weight: 500; }
.route-notices summary span { color: var(--iceland-muted); font-size: 11px; }
.route-notices article { margin: 0 0 10px; padding: 12px; border-radius: 10px; background: var(--iceland-mist); }
.route-notices h3 { font-size: 13px; font-weight: 600; color: var(--iceland-ink); }
.route-notices p { margin-top: 4px; font-size: 12px; line-height: 1.6; color: var(--iceland-muted); }
.iceland-reader .daily-heading { margin: 18px 0 2px; font-size: 16.5px; font-weight: 700; }
.public-activities { list-style: none; margin: 8px 0 0; padding: 0; }
.public-access-note { margin: 0 0 12px; color: var(--iceland-muted); font-size: 12px; line-height: 1.55; }
.route-line { color: var(--iceland-muted); font-size: 12px; line-height: 1.55; margin: 0 0 4px; }
.iceland-reader :deep(:is(button,summary,select,input,a,textarea):focus-visible) { outline: 3px solid #83b3b6; outline-offset: 3px; }
.iceland-reader :deep(button),.iceland-reader :deep(summary) { touch-action: manipulation; }
.iceland-reader :deep(a:visited) { color: #57664a; }
.iceland-reader :deep(.text-slate-400),.iceland-reader :deep(.text-stone-400) { color: var(--iceland-muted); }
.iceland-reader :deep(.journey-status) { background: var(--iceland-moss); color: #435347; font-size: 11px; font-weight: 500; }
.reader-event { border-top: 1px solid var(--iceland-line); padding: 11px 0 8px; }.reader-event__number { flex: none; color: var(--iceland-glacier); font-size: 12px; padding-top: 4px; }.reader-event h3 { font-size: 15px; line-height: 1.5; font-weight: 600; }.reader-event p { font-size: 12.5px; line-height: 1.55; }
.daily-flight-options { margin-top: 8px; padding: 8px 0; border-top: 1px solid var(--iceland-line); font-size: 12px; line-height: 1.6; color: var(--iceland-muted); }.daily-flight-options b { color: var(--iceland-glacier); font-weight: 500; }.daily-flight-options small { font-size: 11px; }
@media(min-width: 768px) { .journey-header__inner { padding: 24px 28px 8px; }.journey-content { padding: 0 28px 48px; } }
@media(prefers-reduced-motion: reduce) { .iceland-reader * { transition: none !important; scroll-behavior: auto !important; } }

.site-brand{font-size:26px;font-weight:700;letter-spacing:-1px;padding:20px max(20px,calc((100vw - 1128px)/2));border-bottom:1px solid #dde3de}.site-brand span{color:#397d86}.journey-content{max-width:1128px;padding-bottom:110px}.journey-header__inner{max-width:1128px}.journey-title{font-size:28px;letter-spacing:-.5px}.journey-navigation svg{width:23px;height:23px}.journey-navigation button{display:flex;align-items:center;justify-content:center;gap:8px}.date-toolbar{display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-top:20px}.date-toolbar button{display:inline-flex;align-items:center;justify-content:center;color:#397d86;min-height:44px;padding:8px 12px;border-radius:10px}.global-information{margin-top:16px}.global-information :deep(.clocks){display:grid;padding:18px;background:#e5ebdf;border-radius:14px;font-size:15px;line-height:1.7}.public-plan-b{display:block}.public-plan-b summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600}.journey-navigation{margin-bottom:22px}.journey-navigation [role="tab"][aria-selected="true"]{color:#397d86;background:#e5ebdf}.journey-dates{position:static}.iceland-reader{color-scheme:light}.global-information:empty{display:none}
@media(max-width:743px){.site-brand{font-size:22px;padding:18px 20px}.journey-header__inner{padding:24px 20px 8px}.journey-title{font-size:24px}.journey-title small{font-size:13px}.journey-content{padding-left:20px;padding-right:20px}.journey-navigation{position:fixed;bottom:0;left:0;right:0;z-index:40;background:#f7f8f6;border-top:1px solid #dde3de;padding:7px 10px calc(7px + env(safe-area-inset-bottom));margin:0;gap:0}.journey-navigation button{flex-direction:column;font-size:10px;min-height:54px;gap:5px;border-radius:0}.journey-navigation [role="tab"][aria-selected="true"]{background:transparent}.activity{padding-top:16px}.brand-row{font-size:11px}.global-information{margin-top:12px}}

.site-header-row{display:flex;align-items:center;gap:24px;border-bottom:1px solid #dde3de;max-width:1128px;margin:auto;padding:0 20px;min-height:80px}.site-brand{border:0;padding:18px 0;flex:1}.account-actions{display:flex;gap:10px;align-items:center}.site-header-row .journey-navigation{margin:0;gap:20px;padding:0;background:transparent}.site-header-row .journey-navigation button{padding:12px 0;font-size:14px;background:transparent!important}.journey-title small{display:block;font-size:14px;margin:12px 0 0;font-weight:400;color:#4e605a}.brand-row{margin-bottom:12px}.nonmember .journey-content{padding-bottom:24px}
@media(max-width:743px){.site-header-row{min-height:68px}.site-header-row .journey-navigation{gap:0;padding:7px 10px calc(7px + env(safe-area-inset-bottom));background:#f7f8f6;margin:0}.site-header-row .journey-navigation button{font-size:10px;padding:3px 0}.journey-title small{font-size:13px}.journey-header__inner{padding-top:25px}.global-information{margin-top:16px}}
</style>
