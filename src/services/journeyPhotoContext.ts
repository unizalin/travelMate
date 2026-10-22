import { onBeforeUnmount, provide, ref, watch, type Ref } from 'vue'
import { photoPreferenceService } from '@/services/photoPreferenceService'
import { loadRoster } from '@/services/journeyRosterService'
import type { MemberPhotoPreferences } from '@/domain/photoPreferences'
import { journeyPhotoKey, type PhotoContext } from '@/domain/journeyPhotoContext'
export { journeyPhotoKey } from '@/domain/journeyPhotoContext'
export function provideJourneyPhotos(tripId: Ref<string>, accountId: Ref<string>, enabled: Ref<boolean>): PhotoContext {
 const preferences=ref<MemberPhotoPreferences|null>(null);const busy=ref(false);const error=ref('');let epoch=0
 watch([tripId,accountId,enabled],async()=>{
  const current=++epoch;preferences.value=null;error.value='';busy.value=false
  if(!enabled.value)return
  busy.value=true
  try{const roster=await loadRoster(tripId.value);if(current!==epoch)return;const member=roster.claims.find(c=>c.isSelf);if(!member)return
   const result=await photoPreferenceService.loadPreferences(tripId.value,member.memberId);if(current===epoch)preferences.value=result
  }catch{if(current===epoch)error.value='攝影偏好暫時無法載入。'}finally{if(current===epoch)busy.value=false}
 },{immediate:true})
 async function update(next:MemberPhotoPreferences){if(busy.value||!preferences.value)return;const current=epoch;busy.value=true;error.value=''
  try{const saved=await photoPreferenceService.savePreferences(next,preferences.value.updatedAt);if(current===epoch)preferences.value=saved}
  catch{if(current===epoch)error.value='攝影偏好未儲存；可能已在其他裝置變更，請重新整理後重試。'}finally{if(current===epoch)busy.value=false}
 }
 const context={preferences,busy,error,update};provide(journeyPhotoKey,context);onBeforeUnmount(()=>{epoch++});return context
}
