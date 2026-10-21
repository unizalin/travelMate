<script setup lang="ts">
import { computed } from 'vue'
import type { JourneyItem } from '@/domain/tripJourney'
import { cameraSettingsByPhotoSpotId } from '@/data/icelandPhotography'
const props = defineProps<{ item: JourneyItem }>()
const phone = computed(() => (props.item.photoSpots ?? []).filter(spot => spot.device === 'phone' || spot.device === 'both'))
const camera = computed(() => (props.item.photoSpots ?? []).filter(spot => spot.device === 'camera' || spot.device === 'both'))
const hasCameraSettings = computed(() => camera.value.some(spot => Boolean(cameraSettingsByPhotoSpotId[spot.id])))
</script>
<template>
  <details v-if="item.photoTip || phone.length || camera.length" class="photo" data-testid="photography-spots">
    <summary>拍攝建議</summary>
    <div class="photo-panel">
      <div class="photo-row">
        <b>iPhone</b>
        <div>
          <p v-for="spot in phone" :key="spot.id">{{ spot.composition }} <span v-if="spot.safetyNote">{{ spot.safetyNote }}</span></p>
          <p v-if="!phone.length">{{ item.photoTip || '先用 1× 構圖，保留高光；人物與地景各留一張。' }}</p>
        </div>
      </div>
      <div class="photo-row">
        <b>相機</b>
        <div>
          <p v-for="spot in camera" :key="spot.id">
            {{ spot.composition }} <span v-if="spot.safetyNote">{{ spot.safetyNote }}</span>
            <span v-if="cameraSettingsByPhotoSpotId[spot.id]" class="camera-settings">建議參數：{{ cameraSettingsByPhotoSpotId[spot.id] }}</span>
          </p>
          <p v-if="!camera.length">{{ item.photoTip || '依現場光線調整曝光；風大或浪區先確保站位安全。' }}</p>
        </div>
      </div>
      <p v-if="hasCameraSettings" class="settings-note">參考 UI 預覽的拍攝起點；光圈與 ISO 未提供，請依現場光線調整。</p>
    </div>
  </details>
</template>
<style scoped>
.photo{color:#397d86;margin:0}.photo summary{cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none;padding:7px 0 0;font-size:12.5px;font-weight:600;line-height:1.55}.photo summary::after{content:'展開 ▾';color:#7a8783;font-size:11px;font-weight:400}.photo[open] summary::after{content:'收合 ▴'}.photo-panel{margin-top:5px;background:#f2f7f5;border-radius:10px;padding:8px 11px}.photo-row{display:flex;gap:6px;line-height:1.6;color:#44534f;font-size:12.5px;margin:0 0 5px}.photo-row:last-child{margin-bottom:0}.photo-row b{align-self:flex-start;flex:none;color:white;background:#397d86;border-radius:5px;padding:1px 6px;font-size:10.5px;font-weight:700}.photo-row p+p{margin-top:5px}.photo-row span{color:#8a4b28}.photo-row .camera-settings{display:block;margin-top:3px;color:#397d86;font-weight:600}.settings-note{margin:5px 0 0;color:#7a8783;font-size:11px;line-height:1.5}
</style>
