<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { buildDailyTimeline, type DailyTimeline, type TripJourney } from '@/domain/tripJourney'
import { publicIcelandJourney } from '@/data/icelandPublic'
import { icelandTrip } from '@/data/icelandTrip'

const props = withDefaults(defineProps<{
  journey?: TripJourney
  publicOnly?: boolean
}>(), {
  journey: () => publicIcelandJourney,
  publicOnly: true,
})

const selectedDate = ref('')

const timeline = computed<DailyTimeline[]>(() => buildDailyTimeline(props.journey))
const days = computed(() => timeline.value.filter(day => day.events.some(event => event.type === 'item' || event.type === 'transport')))
const selectedDay = computed(() => days.value.find(day => day.date === selectedDate.value) ?? days.value[0] ?? null)
const selectedEvents = computed(() => selectedDay.value?.events.filter(event => !props.publicOnly || event.type !== 'accommodation') ?? [])
const stays = computed(() => props.journey.accommodations)
const flights = computed(() => props.journey.transports.filter(transport => transport.kind === 'flight'))
const sharedEventCount = computed(() => days.value.reduce((total, day) => total + day.events.filter(event => event.type === 'item' || event.type === 'transport').length, 0))
const memberCount = computed(() => props.journey.members.length)

watch(days, nextDays => {
  if (!nextDays.some(day => day.date === selectedDate.value)) selectedDate.value = nextDays[0]?.date ?? ''
}, { immediate: true })

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('zh-TW', { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

function dayNumber(date: string): string {
  return String(days.value.findIndex(day => day.date === date) + 1).padStart(2, '0')
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    planned: '規劃中',
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

function dayStops(day: DailyTimeline): DailyTimeline['events'] {
  return day.events.filter(event => event.type === 'item' || event.type === 'transport')
}
</script>

<template>
  <main class="trip-reader min-h-screen bg-[#f5f8f7] text-slate-900 selection:bg-teal-200/70">
    <header class="relative overflow-hidden bg-[#0d3031] text-white">
      <div class="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_15%_20%,rgba(147,197,187,.32),transparent_38%),radial-gradient(circle_at_90%_5%,rgba(250,204,145,.18),transparent_30%)]"></div>
      <div class="relative mx-auto max-w-6xl px-5 pb-10 pt-6 sm:px-8 sm:pb-14 sm:pt-8">
        <div class="flex items-center justify-between gap-3 text-xs font-semibold tracking-[0.18em] text-teal-100/75">
          <span>TRIPBOOK / ICELAND</span>
          <span class="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.16em]">公開閱讀</span>
        </div>
        <div class="mt-12 max-w-3xl sm:mt-16">
          <p class="text-sm font-medium text-amber-100/85">2026.10.30 — 11.07 · Atlantic/Reykjavik</p>
          <h1 class="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-6xl">Iceland <span class="text-teal-200">旅程</span></h1>
          <p class="mt-4 max-w-xl text-sm leading-7 text-teal-50/75 sm:text-base">一份可以一起確認的九日冰島規劃，行程先共享，成員與乘客資料目前保留待確認。</p>
        </div>
        <div class="mt-9 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-2xl border border-white/10 bg-white/[.08] p-4">
            <p class="text-[10px] uppercase tracking-[.18em] text-teal-100/55">天數</p>
            <p class="mt-2 text-xl font-bold">9 日</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[.08] p-4">
            <p class="text-[10px] uppercase tracking-[.18em] text-teal-100/55">共享行程</p>
            <p class="mt-2 text-xl font-bold">{{ sharedEventCount }} 項</p>
          </div>
          <div v-if="publicOnly" class="rounded-2xl border border-white/10 bg-white/[.08] p-4">
            <p class="text-[10px] uppercase tracking-[.18em] text-teal-100/55">航班</p>
            <p class="mt-2 text-xl font-bold">BA802 / 801</p>
          </div>
          <div v-else class="rounded-2xl border border-white/10 bg-white/[.08] p-4">
            <p class="text-[10px] uppercase tracking-[.18em] text-teal-100/55">住宿</p>
            <p class="mt-2 text-xl font-bold">{{ stays.length }} 段</p>
          </div>
          <div v-if="publicOnly" class="rounded-2xl border border-white/10 bg-white/[.08] p-4">
            <p class="text-[10px] uppercase tracking-[.18em] text-teal-100/55">狀態</p>
            <p class="mt-2 text-xl font-bold text-amber-100">待確認</p>
          </div>
          <div v-else class="rounded-2xl border border-white/10 bg-white/[.08] p-4">
            <p class="text-[10px] uppercase tracking-[.18em] text-teal-100/55">旅伴</p>
            <p class="mt-2 text-xl font-bold">{{ memberCount }} 位</p>
          </div>
        </div>
        <div v-if="!publicOnly" class="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-teal-50/80">
          <span class="rounded-full border border-white/15 bg-white/[.08] px-3 py-2">{{ memberCount }} 位旅伴 · 帳號待確認</span>
          <span class="rounded-full border border-white/15 bg-white/[.08] px-3 py-2">配對待確認</span>
          <span class="rounded-full border border-white/15 bg-white/[.08] px-3 py-2">航班乘客待確認</span>
        </div>
        <div v-else class="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-teal-50/80">
          <span class="rounded-full border border-white/15 bg-white/[.08] px-3 py-2">{{ icelandTrip.partySize }} 位旅伴 · 名單待確認</span>
          <span class="rounded-full border border-white/15 bg-white/[.08] px-3 py-2">配對待確認</span>
          <span class="rounded-full border border-white/15 bg-white/[.08] px-3 py-2">航班乘客待確認</span>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
      <section class="grid gap-3 sm:grid-cols-2">
        <article v-for="alert in icelandTrip.alerts" :key="alert.title" class="rounded-2xl border p-4" :class="alert.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-teal-100 bg-teal-50 text-teal-950'">
          <div class="flex gap-3">
            <span class="mt-0.5 text-lg">{{ alert.tone === 'warning' ? '◐' : '✦' }}</span>
            <div>
              <h2 class="text-sm font-bold">{{ alert.title }}</h2>
              <p class="mt-1 text-xs leading-5 opacity-75">{{ alert.message }}</p>
            </div>
          </div>
        </article>
      </section>

      <section class="mt-8 sm:mt-10" aria-labelledby="daily-plan-heading">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[.22em] text-teal-700">Shared itinerary</p>
            <h2 id="daily-plan-heading" class="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">每日安排</h2>
          </div>
          <span class="text-xs font-medium text-slate-400">{{ selectedDay ? formatDate(selectedDay.date) : '尚無日期' }}</span>
        </div>

        <div class="mt-5 flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="行程日期">
          <button v-for="day in days" :key="day.date" type="button" class="min-w-[110px] snap-start rounded-2xl border px-4 py-3 text-left transition" :class="selectedDay?.date === day.date ? 'border-teal-800 bg-teal-800 text-white shadow-lg shadow-teal-900/15' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'" :aria-selected="selectedDay?.date === day.date" role="tab" @click="selectedDate = day.date">
            <span class="block text-[10px] font-bold uppercase tracking-[.18em] opacity-65">Day {{ dayNumber(day.date) }}</span>
            <span class="mt-1 block text-sm font-bold">{{ formatDate(day.date) }}</span>
          </button>
        </div>

        <div v-if="selectedDay" class="mt-4 space-y-3">
          <article v-for="event in selectedEvents" :key="event.id" class="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(22,54,54,.05)] sm:p-6" :class="event.type === 'transport' ? 'border-l-4 border-l-amber-400' : ''">
            <div class="flex gap-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" :class="event.type === 'transport' ? 'bg-amber-100 text-amber-800' : event.type === 'accommodation' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'">
                <span v-if="event.type === 'transport'" aria-hidden="true">✈</span>
                <span v-else-if="event.type === 'accommodation'" aria-hidden="true">⌂</span>
                <span v-else class="text-sm font-black">{{ event.item?.order }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">{{ event.type === 'transport' ? '交通' : event.type === 'accommodation' ? '住宿' : '停留' }}</p>
                    <h3 class="mt-1 text-base font-bold text-slate-900 sm:text-lg">{{ event.name }}</h3>
                  </div>
                  <span v-if="event.item" class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{{ statusLabel(event.item.status) }}</span>
                </div>
                <p v-if="event.type === 'transport' && event.transport" class="mt-2 text-sm font-semibold text-amber-800">{{ event.transport.name }}<span v-if="event.transportPhase !== 'arrival'"> · {{ flightTime(event.transport) }}</span><span v-else> · 抵達 {{ event.transport.arrival.location }}</span></p>
                <p v-else class="mt-2 text-sm text-slate-500">{{ eventLabel(event) }}</p>
                <p v-if="!publicOnly && event.item?.notes" class="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">{{ event.item.notes }}</p>
                <p v-if="!publicOnly && event.item?.photoTip" class="mt-3 text-xs leading-5 text-teal-800"><span class="font-bold">拍攝提示：</span>{{ event.item.photoTip }}</p>
                <p v-if="event.type === 'transport' && event.transport?.notes && !publicOnly" class="mt-3 text-xs leading-5 text-slate-500">{{ event.transport.notes }}</p>
                <p v-if="event.pendingParticipation" class="mt-3 text-xs font-semibold text-amber-700">參與者待確認</p>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="mt-4 rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">行程日期尚待建立。</p>
      </section>

      <section class="mt-10" aria-labelledby="full-itinerary-heading">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[.22em] text-slate-500">All days at a glance</p>
          <h2 id="full-itinerary-heading" class="mt-1 text-2xl font-black tracking-tight text-slate-900">完整路線</h2>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article v-for="day in days" :key="`summary-${day.date}`" class="rounded-2xl border border-slate-200 bg-white p-4">
            <p class="text-[10px] font-bold uppercase tracking-[.18em] text-teal-700">Day {{ dayNumber(day.date) }} · {{ formatDate(day.date) }}</p>
            <ul class="mt-3 space-y-2">
              <li v-for="event in dayStops(day)" :key="`summary-${event.id}`" class="flex gap-2 text-sm font-semibold text-slate-700">
                <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" :class="event.type === 'transport' ? 'bg-amber-500' : 'bg-teal-500'"></span>
                <span>{{ event.name }}</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section class="mt-12" aria-labelledby="flight-heading">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[.22em] text-amber-700">Open passenger binding</p>
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

      <section v-if="!publicOnly" class="mt-12" aria-labelledby="stay-heading">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[.22em] text-indigo-700">Seven stays / eight nights</p>
          <h2 id="stay-heading" class="mt-1 text-2xl font-black tracking-tight text-slate-900">住宿路線</h2>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article v-for="(stay, index) in stays" :key="stay.id" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(22,54,54,.05)]">
            <div class="flex items-center justify-between gap-3">
              <span class="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Stay {{ String(index + 1).padStart(2, '0') }}</span>
              <span class="h-2 w-2 rounded-full bg-teal-500"></span>
            </div>
            <h3 class="mt-4 text-lg font-bold text-slate-900">{{ stay.name }}</h3>
            <p class="mt-2 text-xs text-slate-500">{{ formatDate(stay.checkIn) }} → {{ formatDate(stay.checkOut) }} · 退房日不含住宿</p>
          </article>
        </div>
      </section>

      <div v-if="!publicOnly" class="mt-12 rounded-3xl border border-teal-200 bg-teal-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p class="text-sm font-bold text-teal-950">想一起調整成員、房間與交通？</p>
          <p class="mt-1 text-xs leading-5 text-teal-800/75">規劃資料會先保存在這個帳號的裝置，也可以使用雲端草稿協作。</p>
        </div>
        <RouterLink :to="{ name: 'iceland-planner', params: { tripId: props.journey.tripId } }" class="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-teal-900 px-5 text-sm font-bold text-white transition hover:bg-teal-800 sm:mt-0">開啟規劃</RouterLink>
      </div>

      <p class="mt-12 text-center text-xs leading-5 text-slate-400">公開閱讀只顯示共享行程、日期、地點與交通摘要；成員、住宿與攝影提示維持在私人規劃內。</p>
    </div>
  </main>
</template>
