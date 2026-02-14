<template>
  <TresCanvas clear-color="#050b18" shadows alpha window-size>
    <TresPerspectiveCamera :position="[0, 0, 200]" :fov="60" :near="0.1" :far="1000" />
    <OrbitControls 
      :enable-zoom="false" 
      :auto-rotate="autoRotate" 
      :auto-rotate-speed="2"
      @change="handleChange"
    />
    
    <TresAmbientLight :intensity="0.6" />
    <TresPointLight :position="[50, 50, 100]" :intensity="2" color="#00F2FF" />

    <!-- Globe Group -->
    <TresGroup>
        <!-- Wireframe Globe Base -->
        <TresMesh>
            <TresSphereGeometry :args="[60, 32, 32]" />
            <TresMeshBasicMaterial color="#00F2FF" wireframe :transparent="true" :opacity="0.1" />
        </TresMesh>
        
        <!-- Particles -->
        <TresPoints v-if="particlesGeometry">
             <primitive :object="particlesGeometry" />
             <TresPointsMaterial color="#00F2FF" :size="0.8" transparent :opacity="0.6" :size-attenuation="true" />
        </TresPoints>
        
        <!-- Dart Object (Placeholder for logic) -->
        <TresGroup v-if="localShowDart" :position="[0, 0, 58]" :rotation="[-Math.PI/2, 0, 0]">
           <TresMesh>
              <TresCylinderGeometry :args="[0.4, 0.1, 8, 8]" />
              <TresMeshStandardMaterial color="#dddddd" />
           </TresMesh>
           <TresMesh :position="[0, -2, 0]">
               <TresBoxGeometry :args="[3, 0.1, 3]" />
               <TresMeshBasicMaterial color="#00F2FF" transparent :opacity="0.6" />
           </TresMesh>
        </TresGroup>
    </TresGroup>

    <Stars :radius="200" :depth="50" :count="2000" :size="0.5" :color="0xffffff" />
    
  </TresCanvas>
</template>

<script setup lang="ts">
import { ref, onMounted, shallowRef } from 'vue'
import { OrbitControls, Stars } from '@tresjs/cientos'
import * as THREE from 'three'

defineProps<{
  autoRotate: boolean
  showDart: boolean
}>()

const emit = defineEmits(['update-coords'])

const particlesGeometry = shallowRef<THREE.BufferGeometry | null>(null)
const localShowDart = ref(false)

// Initialize Particles (Simulate Earth Map)
onMounted(() => {
  const particleCount = 2000
  const positions = new Float32Array(particleCount * 3)
  const radius = 60
  
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)
    
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }
  
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particlesGeometry.value = geometry
})

// Interaction Loop
const handleChange = (e: any) => {
   if(!e?.target) return
   // Calculate rough coords from camera/controls if needed, 
   // but easier to track globe rotation if we were rotating the globe.
   // tailored for orbit controls rotating around:
   const azim = e.target.getAzimuthalAngle()
   const polar = e.target.getPolarAngle()
   
   emit('update-coords', { 
     lat: (polar * 180 / Math.PI - 90).toFixed(2), 
     lon: (azim * 180 / Math.PI).toFixed(2) 
   })
}
</script>
