import { computed, inject, onBeforeUnmount, onMounted, provide, ref, watch, type InjectionKey, type Ref } from 'vue'
import { currentPushState, deviceStandalone, getPushConfig, preparePushRegistration, type PushState } from '@/services/auroraPushService'
import { AURORA_CITIES } from '@/domain/auroraConditions'
import { proactiveReminders } from '@/domain/proactiveReminders'
import { tripNightCity, TRIP_PUSH_EXPIRY } from '../../shared/aurora-trip.mjs'
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const deviceKey: InjectionKey<ReturnType<typeof createDeviceReminders>> = Symbol('member-device-reminders')
function createDeviceReminders(accountId: Ref<string>, member: Ref<boolean>) {
 const standalone = ref(deviceStandalone()), state = ref<PushState>({enabled:false}), ready=ref(false), help=ref(false), prompt=ref<InstallPrompt|null>(null), now=ref(new Date()), unavailable=ref(false)
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1)
 let epoch=0,disposed=false,timer:ReturnType<typeof setInterval>|undefined
 const expired=computed(()=>now.value.getTime()>=Date.parse(TRIP_PUSH_EXPIRY))
 const enabled=computed(()=>state.value.enabled && state.value.scope==='trip' && Date.parse(state.value.expiresAt||'')>now.value.getTime())
 const todo=computed(()=>proactiveReminders({member:member.value && ready.value,standalone:standalone.value,enabled:enabled.value,date:now.value.toISOString()}))
 const tonightCity=computed(()=>{const night=new Date(now.value);if(night.getUTCHours()<6)night.setUTCDate(night.getUTCDate()-1);const id=tripNightCity(night.toISOString().slice(0,10));return AURORA_CITIES.find(city=>city.id===id)?.label || (expired.value?'提醒期間已結束':'期間外（10/30 起自動對應）')})
 const status=computed(()=>!ready.value?'正在確認通知狀態':enabled.value?`整趟提醒已開啟・今晚 ${tonightCity.value}・至 11/7 12:00（冰島時間）`:unavailable.value?'未確認・提醒服務尚未連線':'未開啟整趟極光提醒')
 async function refresh() {
  const current=++epoch
  standalone.value=deviceStandalone();now.value=new Date()
  if(!member.value){state.value={enabled:false};ready.value=false;return}
  try {
   if(!('serviceWorker' in navigator) || !('PushManager' in window)) {state.value={enabled:false};return}
   await getPushConfig()
   const next=await currentPushState(await preparePushRegistration())
   if(disposed || current!==epoch)return
   state.value=next;unavailable.value=false
  } catch {if(!disposed && current===epoch){state.value={enabled:false};unavailable.value=true}}
  finally {if(!disposed && current===epoch)ready.value=true}
 }
 function updated(event:Event) {
  const detail:unknown=event instanceof CustomEvent?event.detail:null
  if(!member.value)return
  if(detail && typeof detail==='object' && 'accountId' in detail && detail.accountId===accountId.value && 'state' in detail && detail.state && typeof detail.state==='object' && 'enabled' in detail.state && typeof detail.state.enabled==='boolean') {
   const next=detail.state
   state.value={enabled:next.enabled===true,scope:'scope' in next && next.scope==='trip'?'trip':'tonight',expiresAt:'expiresAt' in next && typeof next.expiresAt==='string'?next.expiresAt:undefined}
   now.value=new Date();ready.value=true;unavailable.value=false
  }
 }
 function capture(event:Event) {
  if(ios)return
  if('prompt' in event && typeof event.prompt==='function' && 'userChoice' in event && event.userChoice instanceof Promise) {event.preventDefault();prompt.value=event as InstallPrompt}
 }
 async function install() {if(!ios && prompt.value){await prompt.value.prompt();await prompt.value.userChoice;prompt.value=null}else help.value=true}
 watch([accountId,member],()=>{ready.value=false;state.value={enabled:false};void refresh()})
 onMounted(()=>{void refresh();window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',refresh);window.addEventListener('focus',refresh);window.addEventListener('tripbook-push-state',updated);timer=setInterval(()=>void refresh(),60000)})
 onBeforeUnmount(()=>{disposed=true;epoch++;clearInterval(timer);window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',refresh);window.removeEventListener('focus',refresh);window.removeEventListener('tripbook-push-state',updated)})
 return {standalone,state,enabled,expired,ready,status,todo,help,ios,tonightCity,expiry:TRIP_PUSH_EXPIRY,canInstall:computed(()=>!ios && !!prompt.value),install,refresh}
}
export function useDeviceReminders(options?: { accountId: Ref<string>; member: Ref<boolean> }) {
 if(options){const device=createDeviceReminders(options.accountId,options.member);provide(deviceKey,device);return device}
 const device=inject(deviceKey)
 if(!device)throw new Error('Member device state must be provided by the journey.')
 return device
}
