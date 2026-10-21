<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { photoChecklist } from '@/data/icelandHandbook'
import { DEPARTURE_CHECKLIST_ITEMS, PACKING_TEMPLATE } from '@/domain/packingChecklist'

/**
 * Public (logged-out) preparation section. Mirrors the static content of
 * TripPreparation — emergency card, confirmed reservations, trip checklists,
 * the packing template and the ISK converter — without account-scoped state:
 * checklist ticks persist only in this browser under a public key.
 */
const groups = [{ name: '出發前清單', items: DEPARTURE_CHECKLIST_ITEMS }, { name: '冬季攝影裝備清單', items: ['防風防水外層、防水褲、保暖底層與中層', '帽子、手套、防水鞋與冰爪', '反光背心、頭燈、雨衣放車上易取處', '飲水、熱飲、零食、行動電源', '廣角／長焦、CPL／ND、鏡頭布、備用電池與記憶卡', '泳衣、換洗衣物與防水收納袋'] }, { name: '每日照片備份', items: ['照片複製到 SSD 或電腦', '第二份留在記憶卡；雙備份前不格式化', '挑 3–5 張標星，不急著重度修圖', '充電、乾燥鏡頭；進室內先裝袋回溫'] }, { name: '攝影清單 · 24 張', items: photoChecklist }]
const publicPackingTemplate = PACKING_TEMPLATE.filter(group => group.category !== '出發前')
const packingItems = publicPackingTemplate.flatMap(group => group.items)
const storageKey = 'tripbook.prep:public'
const checked = ref<string[]>([])
try { const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]'); checked.value = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [] } catch { checked.value = [] }
function saveChecks() { try { localStorage.setItem(storageKey, JSON.stringify(checked.value)) } catch { /* storage unavailable */ } }
const isk = ref(1000), rate = ref<number | null>(null), rateDate = ref(''), rateError = ref(''), loadingRate = ref(false)
const twd = computed(() => rate.value === null ? '' : Math.round(isk.value * rate.value * 100) / 100)
let controller: AbortController | undefined
async function loadRate() { loadingRate.value = true; rateError.value = ''; controller?.abort(); controller = new AbortController(); const timeout = setTimeout(() => controller?.abort(), 8000)
  try { const response = await fetch('https://open.er-api.com/v6/latest/ISK', { signal: controller.signal }); if (!response.ok) throw Error(); const payload: unknown = await response.json(); if (!payload || typeof payload !== 'object' || !('rates' in payload) || !payload.rates || typeof payload.rates !== 'object' || !('TWD' in payload.rates) || typeof payload.rates.TWD !== 'number' || !Number.isFinite(payload.rates.TWD) || payload.rates.TWD <= 0 || !('time_last_update_utc' in payload) || typeof payload.time_last_update_utc !== 'string') throw Error(); rate.value = payload.rates.TWD; rateDate.value = payload.time_last_update_utc } catch { rateError.value = '匯率暫時無法讀取，請重試。'; rate.value = null } finally { clearTimeout(timeout); loadingRate.value = false } }
onMounted(() => { void loadRate() })
onBeforeUnmount(() => controller?.abort())
</script>
<template>
  <div class="public-prep">
    <section class="emergency"><h2>緊急資訊</h2><p class="emergency-number">冰島緊急電話 <a href="tel:112">112</a></p><p><a href="https://www.112.is/en/112-appid" target="_blank" rel="noreferrer">112 Iceland App ↗</a>（可送定位，出發前先安裝）</p><p>租車公司 24h 救援：待補</p><p><a href="https://www.google.com/maps/search/?api=1&query=hospital+near+me" target="_blank" rel="noreferrer">查最近醫院 ↗</a> · 同行者電話：待補</p></section>
    <section><h2>已確認預約 <small>票面細節仍須核對</small></h2><article class="reservation"><b>10/30 BA802</b><span>LHR 13:50 → KEF 17:15</span></article><article class="reservation"><b>11/4 冰洞</b><span>Blue Ice Cave · 行程 09:00–15:00<br /><strong class="warning">集合／報到時間依票券核對</strong></span></article><article class="reservation"><b>11/5 Zodiac</b><span>Jökulsárlón · 行程 11:20–13:20<br /><strong class="warning">集合／報到時間依票券核對</strong></span></article><article class="reservation"><b>11/7 Blue Lagoon</b><span>正式行程日期；入場時段與票券待核對</span></article><article class="reservation"><b>11/7 BA801</b><span>KEF 11:55 → LHR 15:05</span></article></section>
    <template v-for="group in groups" :key="group.name">
      <section>
        <h2>{{ group.name }} <small>{{ group.items.filter(item => checked.includes(item)).length }}/{{ group.items.length }}</small></h2>
        <label v-for="item in group.items" :key="item" class="check"><input v-model="checked" type="checkbox" :value="item" @change="saveChecks" /><span>{{ item }}</span></label>
        <div v-if="group.name === '出發前清單'" class="packing-list">
          <h3>出國行李清單 <small>{{ packingItems.filter(item => checked.includes(item)).length }}/{{ packingItems.length }}</small></h3>
          <details v-for="(category, index) in publicPackingTemplate" :key="category.category" :open="index === 0">
            <summary>{{ category.category }} <small>{{ category.items.filter(item => checked.includes(item)).length }}/{{ category.items.length }}</small></summary>
            <label v-for="item in category.items" :key="item" class="check"><input v-model="checked" type="checkbox" :value="item" @change="saveChecks" /><span>{{ item }}</span></label>
          </details>
        </div>
      </section>
    </template>
    <p class="muted device-note">勾選只保存在這部裝置。</p>
    <section><h2>官方連結與工具</h2><nav class="official"><a href="https://safetravel.is/" target="_blank" rel="noreferrer">SafeTravel 警示 ↗</a><a href="https://umferdin.is/en" target="_blank" rel="noreferrer">Umferðin 路況 ↗</a><a href="https://en.vedur.is/" target="_blank" rel="noreferrer">Veður 天氣 ↗</a><a href="https://www.road.is/" target="_blank" rel="noreferrer">road.is 攝影機 ↗</a></nav><div class="currency"><label>ISK<input v-model.number="isk" type="number" min="0" step="1" /></label><span>⇄</span><label>TWD<input :value="twd" type="number" min="0" step="0.01" :disabled="rate === null" @input="isk = rate ? Number(($event.target as HTMLInputElement).value) / rate : 0" /></label></div><button type="button" :disabled="loadingRate" @click="loadRate">{{ loadingRate ? '讀取中…' : '更新匯率' }}</button><p v-if="rateError" role="status" class="muted">{{ rateError }}</p><p v-if="rate" class="muted">1 ISK ≈ {{ rate }} TWD · {{ rateDate }} · 僅供估算</p><a class="muted" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by ExchangeRate-API ↗</a></section>
  </div>
</template>
<style scoped>
.public-prep{display:grid;gap:12px}.public-prep>section{min-width:0;background:white;border:1px solid #dde3de;border-radius:14px;padding:12px 14px}.public-prep h2{font-size:14px;font-weight:600;line-height:1.5;margin:0 0 8px}.public-prep h2 small{font-size:11.5px;font-weight:400;color:#7a8783;margin-left:5px}.public-prep p{font-size:12.5px;line-height:1.6;margin:4px 0 0}.public-prep .muted{font-size:11px;color:#7a8783}.public-prep .emergency{border-color:#efcdb4;background:#fdf6f1;color:#5c4636}.public-prep .emergency-number{font-size:15px}.emergency-number a{font-weight:700;color:#c76b46}.public-prep a{color:#397d86}.reservation{display:flex;justify-content:space-between;gap:8px;border-top:1px dashed #dde3de;padding:6px 0;font-size:12.5px;line-height:1.5}.reservation:first-of-type{border-top:0}.reservation b{flex:none;font-weight:600}.reservation>span{text-align:right;color:#7a8783}.reservation .warning{color:#c76b46;font-weight:600}.check{display:flex;align-items:flex-start;gap:9px;padding:6px 0;border-top:1px dashed #dde3de;font-size:13px;line-height:1.5;cursor:pointer}.check:first-of-type{border-top:none}.check input{width:17px;height:17px;flex:none;margin-top:1px;accent-color:#397d86}.device-note{margin:0;text-align:center}.official{display:flex;flex-wrap:wrap;gap:7px}.official a{border:1px solid #dde3de;border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:600;line-height:1.5}.public-prep button{min-height:40px;color:#397d86;font-size:12px;padding:7px 12px;border:1px solid #dde3de;border-radius:10px;margin-top:8px}.public-prep button:disabled{opacity:.5}.currency{display:flex;gap:8px;align-items:center;margin:12px 0 0;font-size:11px;color:#7a8783}.currency label{flex:1;min-width:0}.currency input{display:block;width:100%;min-height:40px;border:1px solid #dde3de;border-radius:10px;padding:8px 11px;font:inherit;font-size:14px;color:#263331;background:#f7f8f6}.public-prep :is(a,button,input):focus-visible{outline:3px solid #83b3b6;outline-offset:3px}
.packing-list{border-top:1px solid #dde3de;margin-top:12px;padding-top:12px}.packing-list h3{font-size:13px;font-weight:600;line-height:1.5;color:#263331;margin:0 0 6px}.packing-list h3 small{font-size:11.5px;font-weight:400;color:#7a8783;margin-left:5px}.packing-list details{border-top:1px solid #dde3de;padding:5px 0}.packing-list summary{cursor:pointer;min-height:40px;display:flex;align-items:center;justify-content:space-between;color:#263331;font-size:13px;font-weight:600}.packing-list summary small{font-size:11.5px;font-weight:400;color:#7a8783}.packing-list .check{padding-left:10px}
</style>
