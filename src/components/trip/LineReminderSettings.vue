<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { lineState, prepareLineLink, type LineState } from '@/services/lineReminderService'
const props = defineProps<{ accountId: string; ticket?: string }>()
const state = ref<LineState | null>(null)
const busy = ref(false)
const message = ref('')
const linkUrl = ref('')
let epoch = 0
async function update(action: 'status' | 'enable' | 'disable' | 'unlink' = 'status') {
  const current = ++epoch
  busy.value = true; message.value = ''; state.value = null; linkUrl.value = ''
  try {
    const result = await lineState(action)
    if (current === epoch) state.value = result
  } catch (error) {
    if (current === epoch) message.value = error instanceof Error ? error.message : '設定結果未確認，請重新查詢。'
  } finally { if (current === epoch) busy.value = false }
}
async function bind() {
  if (!props.ticket || busy.value) return
  const current = ++epoch
  busy.value = true; message.value = ''; linkUrl.value = ''
  try {
    const url = await prepareLineLink(props.ticket)
    if (current === epoch) linkUrl.value = url.toString()
  } catch (error) {
    if (current === epoch) message.value = error instanceof Error ? error.message : '綁定未完成，請從 LINE 重新開始。'
  } finally { if (current === epoch) busy.value = false }
}
watch(() => [props.accountId, props.ticket], () => { void update() }, { immediate: true })
onBeforeUnmount(() => { epoch++ })
</script>
<template>
  <section aria-label="LINE 旅行提醒" class="line-settings">
    <h2>LINE 旅行提醒</h2>
    <p>綁定 TravelMate 會員與 LINE，才能自行開啟極光提醒。綁定不會自動開啟提醒，網站裝置通知可另外設定。</p>
    <p v-if="busy" role="status">正在確認…</p>
    <p v-if="message" role="status">{{ message }}</p>
    <template v-if="state">
      <p v-if="!state.linked">尚未綁定。請先加入官方帳號，在 LINE 輸入「通知設定」取得短效綁定連結。</p>
      <p v-else-if="state.blocked">已綁定，但官方帳號目前被封鎖。請先在 LINE 解除封鎖，再重新查詢並開啟提醒。</p>
      <p v-else>{{ state.enabled ? 'LINE 極光提醒已開啟' : '已綁定，LINE 極光提醒未開啟' }}</p>
      <div class="actions">
        <button v-if="ticket && !linkUrl" :disabled="busy" @click="bind">確認綁定這個會員</button>
        <a v-if="linkUrl" :href="linkUrl" rel="noreferrer">前往 LINE 完成身分確認</a>
        <button v-if="state.linked && !state.enabled && !state.blocked" :disabled="busy || Date.parse(state.expiresAt) <= Date.now()" @click="update('enable')">開啟 LINE 極光提醒</button>
        <button v-if="state.enabled" :disabled="busy" @click="update('disable')">關閉 LINE 極光提醒</button>
        <button v-if="state.linked" :disabled="busy" @click="update('unlink')">解除 LINE 綁定</button>
      </div>
    </template>
    <div class="actions">
      <button :disabled="busy" @click="update()">重新查詢狀態</button>
      <a href="https://lin.ee/xIV8f3m" target="_blank" rel="noreferrer">加入 TravelMate 官方帳號</a>
    </div>
    <p>旅行提醒有效至 2026/11/7 12:00（冰島時間）；符合條件才通知，每晚最多一次，不保證看見極光。過期後無法重新開啟。</p>
    <details><summary>綁定資料與隱私</summary><p>此功能保存網站帳號與 LINE 識別碼的對應、通知偏好及發送紀錄；短效綁定連結到期後不能使用。不保存完整聊天內容，LINE 回覆不含私人 Memo、住宿或旅伴資料。可隨時解除綁定，後續 LINE 通知將停止；已送出的 LINE 訊息不會自動收回。</p></details>
  </section>
</template>
<style scoped>
.line-settings{padding:20px;background:white;border:1px solid #dde3de;border-radius:14px;font-size:14px;line-height:1.8}.line-settings h2{font-size:20px;font-weight:600;margin:0 0 12px}.line-settings p{margin:10px 0;color:#52635d}.actions{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.actions :is(button,a){display:inline-flex;align-items:center;min-height:44px;padding:8px 12px;border:1px solid #cbd6cf;border-radius:9px;color:#246757;background:white}.actions button:disabled{opacity:.45}.actions :is(button,a):focus-visible{outline:3px solid #83b3b6;outline-offset:2px}summary{cursor:pointer;min-height:44px;display:flex;align-items:center}
</style>
