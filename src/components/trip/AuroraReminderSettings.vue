<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { AURORA_CITIES, type AuroraCityId } from '@/domain/auroraConditions'
import { currentPushState, deviceNotificationSupport, disableAuroraPush, enableAuroraPush, getPushConfig, preparePushRegistration, type PushState } from '@/services/auroraPushService'
const props = defineProps<{ cityId: AuroraCityId; accountId: string }>()
const support = ref<ReturnType<typeof deviceNotificationSupport>>('unsupported')
const registration = shallowRef<ServiceWorkerRegistration | null>(null)
const publicKey = ref('')
const localService = ref(false)
const state = ref<PushState>({ enabled: false })
const busy = ref(false)
const message = ref('')
let epoch = 0
const expiry = computed(() => state.value.expiresAt ? new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik' }).format(new Date(state.value.expiresAt)) : '')
const activeCity = computed(() => AURORA_CITIES.find(city => city.id === state.value.cityId)?.label || '')
const supportMessage = computed(() => support.value === 'https-required' ? '手機通知需要 HTTPS 正式網址。' : support.value === 'home-screen-required' ? 'iPhone／iPad 請先加入主畫面，從主畫面開啟後再允許通知。' : support.value === 'unsupported' ? '目前的瀏覽器不支援背景通知；可改用手機主畫面版或支援的瀏覽器。' : '')
async function setup() {
 const current = ++epoch
 busy.value = true; message.value = ''; state.value = { enabled: false }; registration.value = null; publicKey.value = ''
 try {
  support.value = deviceNotificationSupport()
  if (support.value !== 'ready') return
  const config = await getPushConfig()
  if (current !== epoch) return
  const worker = await preparePushRegistration()
  const existing = await currentPushState(worker)
  if (current !== epoch) return
  localService.value = config.local; publicKey.value = config.publicKey; registration.value = worker; state.value = existing
 } catch (error) { if (current === epoch) message.value = error instanceof Error ? error.message : '提醒服務尚未連線，請稍後重試。' }
 finally { if (current === epoch) busy.value = false }
}
async function enable() {
 if (!registration.value || !publicKey.value || busy.value) return
 const current = ++epoch
 busy.value = true; message.value = ''
 try {
  const result = await enableAuroraPush(registration.value, publicKey.value, props.cityId)
  if (current === epoch) { state.value = result; message.value = '這部裝置的今晚提醒已啟用。' }
 } catch (error) { if (current === epoch) message.value = error instanceof Error ? error.message : '提醒未啟用，請重試。' }
 finally { if (current === epoch) busy.value = false }
}
async function disable() {
 if (!registration.value || busy.value) return
 const current = ++epoch; busy.value = true; message.value = ''
 try { const result = await disableAuroraPush(registration.value); if (current === epoch) { state.value = result; message.value = '已關閉這部裝置的今晚提醒。' } }
 catch (error) { if (current === epoch) message.value = error instanceof Error ? error.message : '關閉未成功，請重試。' }
 finally { if (current === epoch) busy.value = false }
}
onMounted(() => { void setup() })
watch(() => props.accountId, () => { void setup() })
onBeforeUnmount(() => { epoch++ })
</script>
<template>
 <section aria-label="今晚極光提醒" class="aurora-reminders">
  <h3>今晚提醒我</h3>
  <p>只訂閱這部裝置、所選地區。接下來三小時有雲量較少與活動值得留意的夜間時段才提醒，每晚最多一次；不保證看到極光。</p>
  <p v-if="localService">目前是本機測試服務；旅行時要收鎖屏提醒，仍需部署 HTTPS 網站與推播服務。</p>
  <p v-if="supportMessage" role="status">{{ supportMessage }}</p>
  <p v-if="state.enabled" class="enabled">已啟用 · {{ activeCity }} · 至 {{ expiry }}（冰島時間）</p>
  <p v-if="message" role="status">{{ message }}</p>
  <div class="actions">
   <button v-if="!state.enabled || state.cityId !== cityId" type="button" :disabled="busy || !registration || support !== 'ready'" @click="enable">{{ busy ? '處理中…' : state.enabled ? '改用目前選擇的地區' : '開啟今晚提醒' }}</button>
   <button v-if="state.enabled" type="button" :disabled="busy" @click="disable">關閉今晚提醒</button>
   <button v-if="!registration && support === 'ready'" type="button" :disabled="busy" @click="setup">重新檢查服務</button>
  </div>
  <p>關掉網頁後由推播服務發送；手機需連網並允許通知。此為今晚訂閱，隔天中午到期後停止。</p>
 </section>
</template>
<style scoped>
.aurora-reminders{padding:14px;border:1px solid #d9e1dc;border-radius:12px;background:var(--iceland-mist,#edf3f1);margin-top:12px}.aurora-reminders h3{font-size:14px;font-weight:700;margin:0}.aurora-reminders p{font-size:12px;line-height:1.8;color:#666;margin:7px 0}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.actions button{min-height:44px;border:1px solid #ddd;border-radius:10px;padding:8px 12px;font-size:12px;background:white;color:#356c74;font-weight:600}.actions button:disabled{opacity:.45}.aurora-reminders .enabled{font-weight:700;color:#42604b}.actions button:focus-visible{outline:3px solid #83b3b6;outline-offset:2px}
</style>
