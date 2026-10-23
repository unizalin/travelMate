<script lang="ts">
let openingPromptClaimed=false
</script>
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { markMemberReminderShown, wasMemberReminderShown, type MemberReminderStage } from '@/domain/memberReminderHistory'
import { useDeviceReminders } from '@/composables/useDeviceReminders'
const props=defineProps<{ itinerary: boolean }>()
const emit=defineEmits<{ aurora: [] }>()
const device=useDeviceReminders()
const open=ref(false),dismiss=ref<HTMLButtonElement|null>(null)
const stage=computed<MemberReminderStage|null>(()=>device.todo.value.install?'install':device.todo.value.aurora?'aurora':null)
const displayedStage=ref<MemberReminderStage|null>(null)
watch(()=>[props.itinerary,device.ready.value,stage.value],async()=>{
 if(!props.itinerary || !device.ready.value || displayedStage.value!==stage.value) open.value=false
 if(!openingPromptClaimed && props.itinerary && device.ready.value && stage.value && !wasMemberReminderShown(stage.value)) {
  openingPromptClaimed=true
  displayedStage.value=stage.value
  markMemberReminderShown(stage.value)
  open.value=true
  await nextTick();dismiss.value?.focus()
 }
},{immediate:true})
const visible=computed(()=>open.value && props.itinerary && device.ready.value && displayedStage.value===stage.value && stage.value!==null)
function trapTab(event:KeyboardEvent) {
 if(event.key!=='Tab' || !(event.currentTarget instanceof HTMLElement))return
 const buttons=event.currentTarget.querySelectorAll('button:not(:disabled)')
 const first=buttons[0],last=buttons[buttons.length-1]
 if(event.shiftKey && document.activeElement===first && last instanceof HTMLElement){event.preventDefault();last.focus()}
 else if(!event.shiftKey && document.activeElement===last && first instanceof HTMLElement){event.preventDefault();first.focus()}
}
function later(){open.value=false}
function activate(){open.value=false;emit('aurora')}
</script>
<template>
 <div v-if="visible" class="reminder-backdrop" @keydown.esc="later" @keydown="trapTab">
  <section role="dialog" aria-modal="true" aria-labelledby="member-reminder-title" class="reminder-dialog">
   <h2 id="member-reminder-title">{{ device.todo.value.install ? '把 travelMate 加入主畫面' : '開啟整趟極光提醒' }}</h2>
   <template v-if="device.todo.value.install">
    <p v-if="device.ios">用 Safari 開啟 → 分享 → 加入主畫面，再從主畫面圖示開啟。請勿使用 LINE 內建瀏覽器。</p>
    <p v-else>從瀏覽器選單選擇「安裝應用程式」或「加入主畫面」，再從主畫面圖示開啟。</p>
    <p>加入主畫面後，就能接著開啟這部裝置的整趟極光提醒。</p>
    <button v-if="!device.ios && device.canInstall.value" type="button" @click="device.install">安裝 travelMate</button>
   </template>
   <template v-else><p>10/30–11/6 每晚自動對應觀測城市，條件值得留意才提醒，每晚最多一次。11/7 中午（冰島時間）自動停止。</p><button type="button" @click="activate">前往開啟整趟提醒</button></template>
   <button ref="dismiss" type="button" class="later" @click="later">稍後再說</button>
  </section>
 </div>
</template>
<style scoped>
.reminder-backdrop{position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:#142d3570;padding:20px}.reminder-dialog{width:min(100%,420px);max-height:85dvh;overflow:auto;background:#fff;border-radius:18px;padding:24px;box-shadow:0 16px 70px #142d3530}.reminder-dialog h2{font-size:20px;font-weight:600;color:#263331}.reminder-dialog p{font-size:14px;line-height:1.8;color:#586963;margin-top:12px}.reminder-dialog button{display:block;width:100%;min-height:44px;margin-top:16px;border-radius:10px;background:#203e49;color:#fff;padding:10px;font-size:14px}.reminder-dialog .later{background:#edf2ec;color:#397d86}.reminder-dialog button:focus-visible{outline:3px solid #83b3b6;outline-offset:3px}
</style>
