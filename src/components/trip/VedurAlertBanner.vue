<script setup lang="ts">
import type { VedurAlert, VedurLevel } from '@/services/vedurAlertService'

defineProps<{ alerts: VedurAlert[] }>()
const labels: Record<VedurLevel, string> = { yellow: '黃色警報', orange: '橘色警報', red: '紅色警報' }
const formatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Atlantic/Reykjavik',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
function localTime(value: string) { return formatter.format(new Date(value)) }
</script>

<template>
  <section v-if="alerts.length" class="vedur-alerts" aria-label="Veður 官方天氣警報">
    <div class="vedur-alerts__heading">
      <strong>Veður 官方天氣警報</strong>
      <a href="https://en.vedur.is/vidvaranir" target="_blank" rel="noopener noreferrer">查看官方警報 ↗</a>
    </div>
    <article v-for="(alert, index) in alerts" :key="`${alert.level}-${alert.area}-${alert.startsAt}-${index}`" class="vedur-alert" :class="`vedur-alert--${alert.level}`">
      <div class="vedur-alert__title"><span>{{ labels[alert.level] }}</span><b>{{ alert.area }}</b></div>
      <p>{{ alert.headline }}</p>
      <small>有效時間（冰島） · <time :datetime="alert.startsAt">{{ localTime(alert.startsAt) }}</time>–<time :datetime="alert.endsAt">{{ localTime(alert.endsAt) }}</time></small>
    </article>
  </section>
</template>

<style scoped>
.vedur-alerts{display:grid;gap:7px;margin:8px 0 10px}
.vedur-alerts__heading{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:#263331}
.vedur-alerts__heading strong{font-size:13px;font-weight:700}
.vedur-alerts__heading a{color:#397d86;font-weight:600;white-space:nowrap}
.vedur-alert{border:1px solid #e9c56b;border-left-width:4px;border-radius:11px;background:#fff9e9;padding:9px 11px;color:#263331}
.vedur-alert--orange{border-color:#e2ad91;background:#fdf3ec}
.vedur-alert--red{border-color:#cf797a;background:#fff0f0}
.vedur-alert__title{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px}
.vedur-alert__title span{font-weight:700;color:#8d650e}
.vedur-alert--orange .vedur-alert__title span{color:#a74e29}
.vedur-alert--red .vedur-alert__title span{color:#a42f36}
.vedur-alert__title b{font-weight:600}
.vedur-alert p{margin:4px 0 2px;font-size:13px;font-weight:600;line-height:1.5}
.vedur-alert small{font-size:11.5px;line-height:1.5;color:#5d6965}
</style>
