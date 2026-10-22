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
.journey-dates {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 10px 3px 12px;
  margin-bottom: 12px;
  scroll-padding-inline: 3px;
  scroll-snap-type: x proximity;
}
.journey-dates button {
  display: flex;
  flex: 0 0 64px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 64px;
  padding: 10px 6px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: #263331;
  text-align: center;
  font-variant-numeric: tabular-nums;
  scroll-snap-align: start;
}
.journey-dates span {
  font-size: 10px;
  line-height: 14px;
  letter-spacing: .08em;
  color: #7a8783;
  white-space: nowrap;
}
.journey-dates strong {
  font-size: 15px;
  line-height: 20px;
  font-weight: 600;
  white-space: nowrap;
}
.journey-dates small { display: none; }
.journey-dates [aria-selected=true] {
  background: #233e49;
  color: #f7f8f6;
}
.journey-dates [aria-selected=true] span { color: #e5ebdf; }
.journey-dates button:focus-visible { outline: 3px solid #83b3b6; outline-offset: 2px; }
.journey-dates::-webkit-scrollbar { display: none; }
@media (hover: hover) {
  .journey-dates button:not([aria-selected=true]):hover { background: #e5ebdf; }
}
</style>
