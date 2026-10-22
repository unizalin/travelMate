import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { currentPushState, deviceStandalone, getPushConfig, preparePushRegistration, type PushState } from '@/services/auroraPushService'
import { AURORA_CITIES } from '@/domain/auroraConditions'
import { proactiveReminders } from '@/domain/proactiveReminders'
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
export function useDeviceReminders() {
 const standalone = ref(deviceStandalone()), state = ref<PushState>({enabled:false}), status = ref('正在確認通知狀態'), help = ref(false), prompt = ref<InstallPrompt | null>(null), now = ref(new Date())
 let epoch=0, disposed=false, timer:ReturnType<typeof setInterval>|undefined
 const todo=computed(()=>proactiveReminders({member:true,standalone:standalone.value,enabled:state.value.enabled,date:now.value.toISOString().slice(0,10)}))
 async function refresh() {
  const current=++epoch
  standalone.value=deviceStandalone();now.value=new Date()
  try {
   await getPushConfig()
   const next=await currentPushState(await preparePushRegistration())
   if(disposed || current!==epoch)return
   state.value=next
   status.value=next.enabled?`已開啟・${AURORA_CITIES.find(city=>city.id===next.cityId)?.label || '所選地區'}・至 ${next.expiresAt ? new Intl.DateTimeFormat('zh-TW',{timeZone:'Atlantic/Reykjavik',dateStyle:'short',timeStyle:'short'}).format(new Date(next.expiresAt)) : '今晚'}（冰島時間）`:'未開啟今晚提醒'
  } catch {if(!disposed && current===epoch){state.value={enabled:false};status.value='未開啟・提醒服務尚未連線'}}
 }
 function capture(event:Event) {event.preventDefault(); if('prompt' in event && typeof event.prompt==='function' && 'userChoice' in event) prompt.value=event as InstallPrompt}
 async function install() {if(prompt.value){await prompt.value.prompt();await prompt.value.userChoice;prompt.value=null}else help.value=true}
 onMounted(()=>{void refresh();window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',refresh);window.addEventListener('focus',refresh);window.addEventListener('tripbook-push-state',refresh);timer=setInterval(()=>void refresh(),60000)})
 onBeforeUnmount(()=>{disposed=true;epoch++;clearInterval(timer);window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',refresh);window.removeEventListener('focus',refresh);window.removeEventListener('tripbook-push-state',refresh)})
 return {standalone,state,status,todo,help,canInstall:computed(()=>!!prompt.value),install}
}
