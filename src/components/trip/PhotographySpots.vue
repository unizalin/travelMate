<script setup lang="ts">
import { computed, inject, ref, useId, watch } from 'vue'
import type { JourneyItem } from '@/domain/tripJourney'
import { cameraSettingsByPhotoSpotId } from '@/data/icelandPhotography'
import { photographyAdvice, photoScenes, photoLenses, photoSceneForItem, type PhotoScene, type PhotoLens } from '@/domain/photographyAdvice'
import { photographyWeatherKey } from './photographyContext'
const props = defineProps<{ item: JourneyItem }>()
const phone = computed(() => (props.item.photoSpots ?? []).filter(spot => spot.device === 'phone' || spot.device === 'both'))
const camera = computed(() => (props.item.photoSpots ?? []).filter(spot => spot.device === 'camera' || spot.device === 'both'))
const fieldId = useId()
const weather = inject(photographyWeatherKey, undefined)
const scene = ref<PhotoScene>(photoSceneForItem(props.item.name))
const lens = ref<PhotoLens>('f4')
watch(() => props.item.id, () => { scene.value = photoSceneForItem(props.item.name) })
const advice = computed(() => photographyAdvice({ date: props.item.date, scene: scene.value, lens: lens.value, weather: weather?.value ?? null }))
</script>
<template>
  <details v-if="item.photoTip || phone.length || camera.length" class="photo" data-testid="photography-spots">
    <summary>拍攝建議</summary>
    <div class="photo-panel">
      <div class="photo-controls">
        <label :for="`${fieldId}-scene`">拍攝情境<select :id="`${fieldId}-scene`" v-model="scene"><option v-for="option in photoScenes" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
        <label :for="`${fieldId}-lens`">相機鏡頭<select :id="`${fieldId}-lens`" v-model="lens"><option v-for="option in photoLenses" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
      </div>
      <p v-if="advice.forecastLabel" class="forecast-source">{{ advice.forecastLabel }}</p>
      <ul class="photo-conditions"><li v-for="condition in advice.conditions" :key="condition">{{ condition }}</li></ul>
      <div class="photo-row">
        <b>iPhone</b>
        <div>
          <p v-for="spot in phone" :key="spot.id"> {{ spot.composition }} <span v-if="spot.safetyNote">{{ spot.safetyNote }}</span></p>
          <p v-if="!phone.length">{{ item.photoTip || '先用 1× 構圖，保留高光；人物與地景各留一張。' }}</p>
          <p v-for="tip in advice.phone" :key="tip" class="dynamic-phone">{{ tip }}</p>
        </div>
      </div>
      <div class="photo-row">
        <b>相機</b>
        <div>
          <p v-for="spot in camera" :key="spot.id">
            {{ spot.composition }} <span v-if="spot.safetyNote">{{ spot.safetyNote }}</span>
            <span v-if="advice.slowShutterAllowed && cameraSettingsByPhotoSpotId[spot.id] && scene === 'water'" class="camera-settings">手冊慢門參考：{{ cameraSettingsByPhotoSpotId[spot.id] }}</span>
          </p>
          <p v-if="!camera.length">{{ item.photoTip || '依現場光線調整曝光；風大或浪區先確保站位安全。' }}</p>
          <p class="dynamic-camera"><strong>{{ advice.camera.mode }}</strong> · 光圈 {{ advice.camera.aperture === null ? '自動' : `f/${advice.camera.aperture}` }}<br />快門：{{ advice.camera.shutter }}<br />感光度：{{ advice.camera.iso }}</p>
          <p v-for="note in advice.camera.notes" :key="note">{{ note }}</p>
        </div>
      </div>
      <p class="settings-note">參數是試拍起點；區域日預報不是現場測光，也不代表每個景點同時有相同風雨。選擇只在這個頁面使用，沒有儲存個人偏好。</p>
      <p class="settings-note">操作參考：<a href="https://support.apple.com/zh-tw/102519" target="_blank" rel="noreferrer">Apple 夜間模式</a> · <a href="https://www.sony.com/electronics/support/cameras-camcorders-digital-cameras/articles/00047693" target="_blank" rel="noreferrer">Sony 風景攝影</a></p>
    </div>
  </details>
</template>
<style scoped>
.photo-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:8px}.photo-controls label{display:grid;gap:4px;font-size:11px;color:#44534f;min-width:0}.photo-controls select{width:100%;min-width:0;min-height:44px;padding:6px;border:1px solid #c8d9d3;border-radius:8px;background:white;color:#263331;font:inherit}.photo-conditions{list-style:disc;margin:6px 0 10px;padding-left:16px;color:#526b65;font-size:11px;line-height:1.65}.forecast-source{font-size:11px;color:#526b65;overflow-wrap:anywhere}.photo-row>div{min-width:0;overflow-wrap:anywhere}.dynamic-camera{padding:7px;border-left:2px solid #83b3b6}.settings-note a{text-decoration:underline}@media(max-width:380px){.photo-controls{grid-template-columns:minmax(0,1fr)}}
.photo{color:#397d86;margin:0}.photo summary{cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none;padding:7px 0 0;font-size:12.5px;font-weight:600;line-height:1.55}.photo summary::after{content:'展開 ▾';color:#7a8783;font-size:11px;font-weight:400}.photo[open] summary::after{content:'收合 ▴'}.photo-panel{margin-top:5px;background:#f2f7f5;border-radius:10px;padding:8px 11px}.photo-row{display:flex;gap:6px;line-height:1.6;color:#44534f;font-size:12.5px;margin:0 0 5px}.photo-row:last-child{margin-bottom:0}.photo-row b{align-self:flex-start;flex:none;color:white;background:#397d86;border-radius:5px;padding:1px 6px;font-size:10.5px;font-weight:700}.photo-row p+p{margin-top:5px}.photo-row span{color:#8a4b28}.photo-row .camera-settings{display:block;margin-top:3px;color:#397d86;font-weight:600}.settings-note{margin:5px 0 0;color:#7a8783;font-size:11px;line-height:1.5}
</style>
