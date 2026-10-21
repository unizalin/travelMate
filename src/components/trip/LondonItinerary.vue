<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TripJourney } from '@/domain/tripJourney'
import { londonItinerary } from '@/data/londonItinerary'
import ItineraryDates from './ItineraryDates.vue'
import ItineraryActivity from './ItineraryActivity.vue'
const props = withDefaults(defineProps<{ journey: TripJourney; editing?: boolean; date?: string; embedded?: boolean }>(), { editing: false, embedded: false })
const items = computed(() => props.journey.items.filter(item => item.date >= '2026-10-24' && item.date <= '2026-10-29'))
const dates = computed(() => [...new Set(items.value.map(item => item.date))].sort())
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const localDate = ref('')
const selectedDate = computed({ get: () => props.date ?? localDate.value, set: value => { localDate.value = value } })
watch(dates, next => { if (!next.includes(selectedDate.value)) selectedDate.value = next.includes(today) ? today : next[0] ?? '' }, { immediate: true })
const selectedItems = computed(() => items.value.filter(item => item.date === selectedDate.value && item.status !== 'fallback').sort((a,b) => a.order-b.order))
const alternatives = computed(() => items.value.filter(item => item.status === 'fallback'))
const dayPlan = computed(() => props.journey.dayPlans?.[selectedDate.value])
const dayTitle = computed(() => londonItinerary.days.find(day => day.date === selectedDate.value)?.title)
const stays = computed(() => props.journey.accommodations.filter(stay => stay.checkIn <= selectedDate.value && selectedDate.value < stay.checkOut))
const formatDate = (date: string) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
let touchX = 0, touchY = 0
function touchStart(event: TouchEvent) { touchX=event.changedTouches[0].clientX; touchY=event.changedTouches[0].clientY }
function touchEnd(event: TouchEvent) {
  if (props.editing) { event.stopPropagation(); return }
  if (props.embedded) return
  if (event.target instanceof Element && event.target.closest('input,textarea,button,a')) return
  const dx=event.changedTouches[0].clientX-touchX,dy=event.changedTouches[0].clientY-touchY
  if (Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.5) {
    const index=dates.value.indexOf(selectedDate.value)+(dx<0?1:-1)
    if (dates.value[index]) selectedDate.value=dates.value[index]
  }
}
</script>
<template>
  <section v-if="dates.length" class="london-prelude" aria-label="倫敦前段行程">
    <slot name="participants" />
    <ItineraryDates v-if="!embedded" v-model="selectedDate" :dates="dates" label="倫敦日期" />
    <div :id="embedded ? undefined : `day-panel-${selectedDate}`" :role="embedded ? undefined : 'tabpanel'" :aria-labelledby="embedded ? undefined : `day-tab-${selectedDate}`" @touchstart.passive="touchStart" @touchend.passive="touchEnd">
      <h2 v-if="!embedded" class="daily-heading">{{ formatDate(selectedDate) }} · Day {{ String(dates.indexOf(selectedDate)+1).padStart(2,'0') }}</h2>
      <h2 v-if="embedded" class="daily-heading">{{ dayTitle || formatDate(selectedDate) }}</h2>
      <p class="day-note">交通、營業時間依你提供的內容整理，並非預約或停留時段；出發前再確認。</p>
      <slot v-if="dayPlan" name="plan" :date="selectedDate" :plan="dayPlan"><div class="plan-b"><b>保住</b> {{ dayPlan.keep }} ｜ <b>先刪</b> {{ dayPlan.skip }}</div></slot>
      <slot name="activities" :items="selectedItems" :today="selectedDate===today"><ol class="activities"><ItineraryActivity v-for="(item,index) in selectedItems" :key="item.id" :item="item" :index="index" /></ol></slot>
      <section v-for="stay in stays" :key="stay.id" class="compact-stay"><h3>今晚住宿 · {{ stay.name }}</h3><p>入住時間待補 · {{ stay.benefits.join(' · ') || '早餐、停車等備註待補' }}</p></section>
      <slot name="add" :date="selectedDate" />
      <details v-if="alternatives.length" class="alternatives"><summary>備選景點與餐廳 <span class="disclosure-label" aria-hidden="true" /></summary><slot name="activities" :items="alternatives" :today="false"><ol class="activities"><ItineraryActivity v-for="(item,index) in alternatives" :key="item.id" :item="item" :index="index" /></ol></slot></details>
    </div>
  </section>
</template>
<style scoped>
.london-prelude{padding-top:6px}.activities{list-style:none;padding:0;margin-top:8px}.daily-heading{font-size:16.5px;font-weight:700;margin:14px 0 2px}.day-note{font-size:12px;line-height:1.55;color:#7a8783;margin:0 0 4px}.plan-b{font-size:12px;line-height:1.55;margin:8px 0 0;color:#7a8783}.plan-b b{color:#263331}.plan-b label{display:grid;gap:4px}.plan-b input{min-height:44px;border:1px solid #ccd5cf;border-radius:8px;padding:8px;background:white}.compact-stay{padding:11px 13px;margin:14px 0 0;border:1px solid #dde3de;border-radius:14px;background:white}.compact-stay h3{font-size:13px;font-weight:600;margin-bottom:3px}.compact-stay p{font-size:12px;color:#7a8783;line-height:1.55}.alternatives{margin-top:14px;border-top:1px solid #dde3de}.alternatives summary{display:flex;align-items:center;justify-content:space-between;padding:12px 0 2px;font-size:14px;font-weight:600;cursor:pointer;list-style:none}.disclosure-label{font-size:12px;font-weight:400;color:#7a8783}.disclosure-label::after{content:'展開 ▾'}.alternatives[open] .disclosure-label::after{content:'收合 ▴'}
</style>
