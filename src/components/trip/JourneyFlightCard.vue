<script setup lang="ts">
import type { IcelandFlight } from '@/data/icelandFlights'
import { taiwanFlightTime } from '@/domain/flightDisplay'
defineProps<{ flight: IcelandFlight }>()
</script>
<template>
  <article class="flight-card">
    <div class="flight-heading"><b>{{ flight.name }}</b><span>{{ flight.date || '日期待補' }}</span></div>
    <div class="flight-route"><div><b>{{ flight.departure }}</b><span>{{ flight.from }} 出發</span></div><span class="flight-path">起降當地時間</span><div><b>{{ flight.arrival }}</b><span>{{ flight.to }} 抵達</span></div></div>
    <p class="flight-meta">訂位代號：待補 · 行李額：待補</p>
    <p class="flight-meta">台灣 {{ taiwanFlightTime(flight) }}</p>
    <p v-if="flight.arrivalDate !== flight.date" class="flight-meta">抵達日期：{{ flight.arrivalDate || '待補' }}</p>
    <p class="checkin"><b>提醒</b>　{{ flight.reminder ?? '線上報到開放時間待確認，以航空公司通知為準。' }}<slot name="reminder" /></p>
    <slot />
  </article>
</template>
<style scoped>
.flight-card{padding:12px 0 10px;border-top:1px solid #dde3de;min-width:0}.flight-card:first-child{border-top:none;padding-top:2px}.flight-heading{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.flight-heading b{font-size:14.5px;font-weight:600}.flight-heading>span{font-size:11.5px;color:#7a8783}.flight-route{display:flex;align-items:center;gap:10px;margin:8px 0 2px}.flight-route>div{flex:none}.flight-route b{display:block;font-size:19px;line-height:1.5;font-weight:600}.flight-route>div>span{display:block;font-size:11px;color:#7a8783}.flight-path{flex:1;min-width:0;text-align:center;font-size:11px;color:#7a8783;border-top:1.5px dashed #c8cfcb;padding-top:3px;margin:0 2px}.flight-meta{font-size:12.5px;color:#7a8783;line-height:1.65;margin:4px 0 0}.checkin{margin:8px 0 0;font-size:12.5px;background:#fdf3ec;border:1px solid #f0d9c8;color:#8a4b28;border-radius:9px;padding:6px 9px;line-height:1.5}.checkin>b{color:#c76b46}.checkin>span{display:block;margin-top:4px}.flight-card :slotted(button){min-height:40px;font-size:12px;border:1px solid #dde3de;border-radius:9px;padding:6px 12px;margin-top:10px;color:#397d86}.flight-card :slotted(button[aria-pressed=true]){background:#263331;border-color:#263331;color:white}.flight-card :slotted(button:disabled){opacity:.5}
</style>
