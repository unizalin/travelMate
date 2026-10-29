<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, useId } from 'vue'
import type { JourneyItem } from '@/domain/tripJourney'
import { photographyAdvice, photoSceneForItem } from '@/domain/photographyAdvice'
import { photographyWeatherKey } from './photographyContext'
import PhotographySpots from './PhotographySpots.vue'
import { memberPhotoDeviceKey, photoDevices, memberPhotoAdvice, type PhotoDevice } from '@/domain/memberPhotography'
const props = defineProps<{ item: JourneyItem }>()
const device = inject(memberPhotoDeviceKey, ref<PhotoDevice>('a7c'))
const weather = inject(photographyWeatherKey, undefined)
const now = ref(Date.now())
const timer = setInterval(() => { now.value = Date.now() }, 60_000)
onBeforeUnmount(() => clearInterval(timer))
const fieldId = useId()
const scene = computed(() => photoSceneForItem(props.item.name))
const forecast = computed(() => photographyAdvice({ date: props.item.date, scene: scene.value, lens: 'f4', weather: weather?.value ?? null, now: now.value }))
const advice = computed(() => memberPhotoAdvice(props.item.name, device.value, forecast.value.slowShutterAllowed))
</script>
<template>
  <PhotographySpots :item="item" />
  <details class="member-photo" data-testid="member-photography">
    <summary>我的拍攝設定 <span>相機 · Action 5 · 濾鏡 ▾</span></summary>
    <div class="member-photo-panel">
      <label :for="fieldId">使用器材</label>
      <select :id="fieldId" v-model="device"><option v-for="option in photoDevices" :key="option.value" :value="option.value">{{ option.label }}</option></select>
      <p class="forecast">{{ forecast.forecastLabel || '基本設定 · 尚無有效區域預報' }}</p>
      <ul><li v-for="condition in forecast.conditions" :key="condition">{{ condition }}</li></ul>
      <h4>{{ advice.title }}</h4>
      <p>{{ advice.settings }}</p><p>{{ advice.composition }}</p>
      <p v-for="note in advice.notes" :key="note">{{ note }}</p>
      <template v-if="device !== 'action5'">
        <h4>濾鏡怎麼選</h4><p>{{ advice.nd }}</p><p>{{ advice.cpl }}</p>
        <details v-if="advice.water"><summary>想拍流水慢門</summary><p>{{ advice.water }}</p></details>
      </template>
      <details><summary>完整設定表</summary>
        <p>α7C II：1 風景 A／F8／Auto ISO／AF-S；2 動態 S／1/1000 秒／Auto ISO／AF-C／追蹤 Zone；3 極光 M／F4／4 秒／ISO 3200／MF。</p>
        <p>α6400：MR1 長焦風景 A／F5.6／Auto ISO／AF-S；MR2 人物與動物 S／1/1000 秒／Auto ISO／AF-C。</p>
        <p>α7C II：RAW＋JPEG；Fn 選單 12 格；C1 對焦模式；C2 對焦放大鏡。</p>
        <p>ND64 減光 6 級；CPL 旋轉比較反光。不預設疊裝，先確認鏡頭口徑相容。</p>
      </details>
      <p class="footnote">設定是試拍起點，請在器材上手動調整。日預報不是現場測光；光線暗時先取下濾鏡。器材選擇只在本次旅程頁保留，不上傳帳號。</p>
      <a v-if="device === 'action5'" href="https://www.dji.com/osmo-action-5-pro/specs" target="_blank" rel="noreferrer">DJI Action 5 Pro 操作規格</a>
    </div>
  </details>
</template>
<style scoped>
.member-photo{margin-top:8px;color:#397d86;font-size:12.5px;line-height:1.65}.member-photo>summary{cursor:pointer;padding:8px 0;display:flex;flex-wrap:wrap;gap:4px;justify-content:space-between;font-weight:600}.member-photo>summary span,.forecast,.footnote{font-size:11px;color:#667972}.member-photo-panel{background:#f2f7f5;border:1px solid #d7e5df;border-radius:10px;padding:12px;color:#44534f;overflow-wrap:anywhere}.member-photo-panel label{display:block;font-weight:600}.member-photo-panel select{width:100%;min-height:44px;background:white;border:1px solid #c8d9d3;border-radius:8px;padding:8px;color:#263331;font:inherit}.member-photo-panel p{margin:7px 0}.member-photo-panel ul{list-style:disc;padding-left:18px;font-size:11px}.member-photo-panel h4{font-weight:700;margin-top:12px;color:#397d86}.member-photo-panel details{margin-top:12px}.member-photo-panel summary{cursor:pointer;min-height:36px}.member-photo-panel a{text-decoration:underline}
</style>
