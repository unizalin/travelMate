<script setup lang="ts">
import { nextTick, watch } from 'vue'
const props = withDefaults(defineProps<{ dates: string[]; modelValue: string; label?: string }>(), { label: '行程日期' })
const emit = defineEmits<{ 'update:modelValue': [date: string] }>()
const format = (date: string) => new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
const weekday = (date: string) => new Intl.DateTimeFormat('zh-TW', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)).replace('週','')
function select(date: string) {
  emit('update:modelValue', date)
}
watch(() => props.modelValue, async date => {
  await nextTick()
  document.getElementById(`day-tab-${date}`)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
}, { immediate: true })
function navigate(event: KeyboardEvent, index: number) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? props.dates.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + props.dates.length) % props.dates.length
  void select(props.dates[next])
  document.getElementById(`day-tab-${props.dates[next]}`)?.focus()
}
</script>
<template>
  <div class="journey-dates" role="tablist" :aria-label="label">
    <button v-for="(date,index) in dates" :id="`day-tab-${date}`" :key="date" type="button" role="tab" :aria-selected="modelValue === date" :aria-controls="`day-panel-${date}`" :aria-label="`Day ${index+1} ${format(date)}`" :tabindex="modelValue === date ? 0 : -1" @click="select(date)" @keydown="navigate($event,index)">
      <span>DAY {{ String(index+1).padStart(2,'0') }}</span><strong>{{ Number(date.slice(5,7)) }}/{{ Number(date.slice(8,10)) }}<small>（{{ weekday(date) }}）</small></strong>
    </button>
  </div>
</template>
<style scoped>
.journey-dates{display:flex;gap:10px;position:sticky;top:0;z-index:5;overflow-x:auto;scrollbar-width:none;padding:14px 18px 16px;margin:0 -18px;border-bottom:1px solid #dde3de;background:#f7f8f6;scroll-padding-inline:18px;scroll-snap-type:x proximity}
.journey-dates button{flex:none;width:84px;min-height:58px;padding:9px 2px;border:1px solid #dde3de;border-radius:13px;scroll-snap-align:start;background:white;color:#263331;text-align:center}
.journey-dates [aria-selected=true]{background:#397d86;border-color:#397d86;color:white}
.journey-dates span{display:block;font-size:10px;letter-spacing:.1em;color:#7a8783}.journey-dates strong{display:block;font-size:13px;font-weight:700;white-space:nowrap}.journey-dates small{font-size:13px;font-weight:700}
.journey-dates [aria-selected=true] span{color:#cfe3e6}
.journey-dates button:focus-visible{outline:3px solid #83b3b6;outline-offset:2px}
.journey-dates::-webkit-scrollbar{display:none}
@media(min-width:768px){.journey-dates{padding-inline:28px;margin-inline:-28px}}
</style>
