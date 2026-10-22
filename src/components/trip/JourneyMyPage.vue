<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TripJourney } from '@/domain/tripJourney'
import JourneyLedger from './JourneyLedger.vue'
import TripPreparation from './TripPreparation.vue'
import AuroraReminderSettings from './AuroraReminderSettings.vue'
import {useDeviceReminders} from '@/composables/useDeviceReminders'
const props=defineProps<{identityName:string;syncStatus:string;tripId:string;accountId:string;journey:TripJourney;flightNames:string[];packingRemaining:number|null;selfMemberId?:string;offline:boolean;canEdit:boolean}>()
const emit=defineEmits<{'flights':[];'preparation':[];'aurora':[]}>()
const ledgerOpen=ref(false)
const device=useDeviceReminders()
const offlineRevision=ref(0)
const offlineStatus=computed(()=>{void offlineRevision.value;try{const value=localStorage.getItem(`tripbook.prep:${props.accountId}:${props.tripId}:offline`);return value?`已下載・最近同步 ${new Date(value).toLocaleString('zh-TW')}`:'未下載'}catch{return '未下載'}})
</script>
<template>
 <div class="my-page">
  <section class="my-section identity-card"><div><p class="section-kicker">我的旅程</p><h2>{{identityName}}</h2><p>已認領成員</p></div><span class="sync-pill" role="status">{{syncStatus}}</span></section>
  <section v-if="!flightNames.length || packingRemaining || device.todo.value.install || device.todo.value.aurora" class="my-section"><h2>我的待辦</h2>
   <button v-if="!flightNames.length" class="task-row" @click="emit('flights')"><span>尚未選擇航班</span><span aria-hidden="true">→</span></button>
   <button v-if="packingRemaining" class="task-row" @click="emit('preparation')"><span>行李尚有 {{packingRemaining}} 項未完成</span><span aria-hidden="true">→</span></button>
   <button v-if="device.todo.value.install" class="task-row" @click="device.help.value=true"><span>把 travelMate 加入主畫面<small>離線行程與通知需要</small></span><span aria-hidden="true">→</span></button>
   <div v-if="device.help.value && device.todo.value.install" class="install-help"><p>iPhone：用 Safari 開啟 → 分享按鈕 → 加入主畫面 → 改從主畫面圖示開啟。LINE 內建瀏覽器無法安裝，請改用 Safari。</p><p>Android／Chrome：使用瀏覽器選單的「安裝應用程式」或「加入主畫面」。</p><button v-if="device.canInstall.value" @click="device.install">安裝 travelMate</button><button @click="device.help.value=false">收合說明</button></div>
   <button v-if="device.todo.value.aurora" class="task-row" @click="emit('aurora')"><span>開啟今晚極光提醒<small>只對今晚有效，每晚重新開啟</small></span><span aria-hidden="true">→</span></button>
  </section>
  <section class="my-section"><h2>我的航班</h2><button class="task-row" @click="emit('flights')"><span>{{flightNames.join('、') || '尚未選擇航班'}}<small>查看航段與同行名單</small></span><span aria-hidden="true">→</span></button></section>
  <details class="my-section" @toggle="ledgerOpen=($event.target as HTMLDetailsElement).open"><summary><span>旅費記帳<small>共同支出、分帳與已還款紀錄</small></span></summary><JourneyLedger v-if="ledgerOpen" :trip-id="tripId" :account-id="accountId" :members="journey.members" :self-member-id="selfMemberId" :disabled="offline || !canEdit" /></details>
  <slot name="management" />
  <section class="my-section"><h2>帳號與裝置</h2><slot name="account" />
   <details class="device-row"><summary><span>離線行程<small>{{offlineStatus}}</small></span></summary><TripPreparation :account-id="accountId" :trip-id="tripId" :journey="journey" account-tools @offline-updated="offlineRevision++" /></details>
   <details class="device-row"><summary><span>通知提醒<small>{{device.status.value}}</small></span></summary><AuroraReminderSettings city-id="reykjavik" :account-id="accountId" /></details>
  </section>
 </div>
</template>
<style scoped>
.my-page{display:grid;gap:16px;padding-top:12px}.my-section{min-width:0;padding:20px;background:white;border:1px solid #dde3de;border-radius:14px;font-size:14px;line-height:1.7}.my-section h2{font-size:18px;font-weight:600;margin:0 0 12px;color:#263331}.identity-card{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;background:#e5ebdf}.identity-card h2{font-size:26px;margin:2px 0}.identity-card p{margin:0;color:#68766f;font-size:12px}.section-kicker{letter-spacing:.04em}.sync-pill{max-width:100%;padding:5px 10px;border:1px solid #bacbc0;border-radius:999px;font-size:11px;color:#397d86;overflow-wrap:anywhere}.task-row{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:56px;width:100%;padding:12px 0;text-align:left;color:#263331;border-top:1px solid #e5ebe6}.task-row small,summary small{display:block;margin-top:3px;color:#68766f;font-size:12px;font-weight:400}.task-row>span:last-child{color:#397d86}summary{display:flex;justify-content:space-between;align-items:center;gap:12px;list-style:none;min-height:44px;font-weight:600;cursor:pointer}summary::-webkit-details-marker{display:none}summary::after{content:'＋';color:#397d86;font-size:20px;font-weight:400}details[open]>summary::after{content:'−'}.device-row{border-top:1px solid #dde3de;padding:12px 0}.device-row:last-child{padding-bottom:0}.install-help{padding:12px;background:#f7f8f6;border-radius:10px;font-size:12px}.install-help button{min-height:44px;margin-right:16px;color:#397d86}.my-page :deep(button){touch-action:manipulation}.my-page :is(button,summary):focus-visible{outline:3px solid #83b3b6;outline-offset:3px}.my-page :deep([aria-label="邀請管理"]){margin:0;padding:20px;border:1px solid #dde3de;border-radius:14px;background:white}.my-page :deep([aria-label="邀請管理"]>summary){font-size:18px;min-height:44px}.my-page :deep(.account-row){padding:12px 0;border-top:1px solid #dde3de}.my-page :deep(.account-row p){margin:0 0 6px}.my-page :deep(.account-row strong){display:block;color:#68766f;font-size:12px;font-weight:400;overflow-wrap:anywhere}.my-page :deep(.account-row button){font-size:12px;min-height:44px;margin-right:18px;color:#397d86}@media(max-width:390px){.my-section{padding:16px}.identity-card h2{font-size:24px}}
</style>
