<script setup lang="ts">
import { computed, inject } from 'vue'
import { journeyPhotoKey } from '@/domain/journeyPhotoContext'
import { icelandPhotoSpots } from '@/data/icelandPhotography'
const photo = inject(journeyPhotoKey, null)
const spots = computed(() => Object.entries(icelandPhotoSpots).flatMap(([name,spots])=>spots.map(spot=>({...spot,name}))))
function favorite(id: string, device: 'phoneSpotIds' | 'cameraSpotIds') {
  const current=photo?.preferences.value
  if (!photo || !current) return
  const values=current[device].includes(id)?current[device].filter(value=>value!==id):[...current[device],id]
  void photo.update({...current,[device]:values})
}
</script>
<template>
  <details v-if="photo?.preferences.value" class="photo-settings">
    <summary>攝影偏好與收藏</summary>
    <label><input type="checkbox" :checked="photo.preferences.value.showPhotography" :disabled="photo.busy.value" @change="photo.update({...photo.preferences.value,showPhotography:($event.target as HTMLInputElement).checked})" /> 顯示拍攝建議</label>
    <p v-if="photo.error.value" role="alert">{{photo.error.value}}</p>
    <div v-for="spot in spots" :key="spot.id" class="favorite-row"><p>{{spot.name}} · {{spot.title}}</p><button v-if="spot.device!=='camera'" :disabled="photo.busy.value" :aria-pressed="photo.preferences.value.phoneSpotIds.includes(spot.id)" @click="favorite(spot.id,'phoneSpotIds')">{{photo.preferences.value.phoneSpotIds.includes(spot.id)?'★ 已收藏手機拍攝點':'☆ 收藏手機拍攝點'}}</button><button v-if="spot.device!=='phone'" :disabled="photo.busy.value" :aria-pressed="photo.preferences.value.cameraSpotIds.includes(spot.id)" @click="favorite(spot.id,'cameraSpotIds')">{{photo.preferences.value.cameraSpotIds.includes(spot.id)?'★ 已收藏相機拍攝點':'☆ 收藏相機拍攝點'}}</button></div>
  </details>
</template>
<style scoped>.photo-settings{font-size:13px;line-height:1.7}.photo-settings summary{min-height:44px;cursor:pointer;color:#397d86}.photo-settings label{display:flex;gap:8px;min-height:44px;align-items:center}.favorite-row{padding:12px 0;border-bottom:1px solid #dde3de}.favorite-row button{min-height:44px;margin-right:16px;color:#397d86}.favorite-row button[aria-pressed=true]{font-weight:600}</style>
