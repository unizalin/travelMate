<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { OrbitControls, Stars } from '@tresjs/cientos'
import DottedGlobe from './DottedGlobe.vue'

defineProps<{
  size?: number
}>()

const emit = defineEmits<{
  (e: 'dart-land', lat: number, lng: number): void
  (e: 'update-coords', lat: number, lng: number): void
}>()

const handleChange = (e: any) => {
    // In some TresJS/cientos versions, the target might be the instance, or have an 'object' property
    const controls = e?.target
    if (!controls) return
    
    try {
      // Check if methods exist, use fallbacks if needed
      const azim = typeof controls.getAzimuthalAngle === 'function' 
        ? controls.getAzimuthalAngle() 
        : (controls.object?.rotation?.y || 0)
        
      const polar = typeof controls.getPolarAngle === 'function'
        ? controls.getPolarAngle()
        : (controls.object?.rotation?.x || 0)
      
      emit('update-coords', 
        Number((polar * 180 / Math.PI - 90).toFixed(2)), 
        Number((azim * 180 / Math.PI).toFixed(2))
      )
    } catch (err) {
      console.warn('OrbitControls sync error:', err)
    }
}

const handleTap = () => {
    // Random lat/lng for "Dart Throw"
    const lat = (Math.random() * 180) - 90
    const lng = (Math.random() * 360) - 180
    emit('dart-land', lat, lng)
}
</script>

<template>
  <div class="w-full h-full relative cursor-pointer" @click="handleTap">
    <TresCanvas clear-color="#000000" alpha>
      <TresPerspectiveCamera :position="[0, 0, 8]" :look-at="[0, 0, 0]" />
      <OrbitControls 
        :enable-zoom="false" 
        :auto-rotate="true" 
        :auto-rotate-speed="0.5" 
        @change="handleChange"
      />
      
      <Stars :radius="100" :depth="50" :count="5000" :factor="4" :saturation="0" :fade="true" />
      
      <DottedGlobe />
      
      <!-- Center Target Crosshair (Optional, can be CSS) -->
      <TresMesh :position="[0, 0, 2.5]">
          <TresRingGeometry :args="[0.05, 0.06, 32]" />
          <TresMeshBasicMaterial color="#ffffff" :transparent="true" :opacity="0.5" />
      </TresMesh>
    </TresCanvas>

    <!-- Overlay UI for feedback -->
    <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div class="w-40 h-40 border border-white/10 rounded-full animate-ping opacity-20"></div>
        <div class="w-20 h-20 border border-white/20 rounded-full flex items-center justify-center">
            <div class="w-1 h-1 bg-white rounded-full"></div>
        </div>
    </div>
  </div>
</template>

<style scoped>
canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
