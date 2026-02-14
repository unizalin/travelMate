<script setup lang="ts">
import { ref } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'

const globeRef = ref()
const { onBeforeRender } = useLoop()

// Create a dotted globe geometry
const createDottedGlobe = () => {
    const radius = 2
    const dotsCount = 2500
    const positions = new Float32Array(dotsCount * 3)
    const sizes = new Float32Array(dotsCount)
    
    for (let i = 0; i < dotsCount; i++) {
        const phi = Math.acos(-1 + (2 * i) / dotsCount)
        const theta = Math.sqrt(dotsCount * Math.PI) * phi
        
        positions[i * 3] = radius * Math.cos(theta) * Math.sin(phi)
        positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi)
        positions[i * 3 + 2] = radius * Math.cos(phi)
        
        sizes[i] = Math.random() * 0.05 + 0.02
    }
    
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    return geometry
}

const globeGeometry = createDottedGlobe()
const globeMaterial = new THREE.PointsMaterial({
    color: '#00f2ff', // neon cyan
    size: 0.05,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
})

onBeforeRender(({ delta }) => {
    if (globeRef.value) {
        globeRef.value.rotation.y += delta * 0.1
    }
})
</script>

<template>
  <TresAmbientLight :intensity="0.5" />
  <TresPointLight :position="[10, 10, 10]" :intensity="2" color="#00f2ff" />
  
  <TresGroup ref="globeRef">
    <!-- Wireframe Base -->
    <TresMesh>
        <TresSphereGeometry :args="[2.02, 32, 32]" />
        <TresMeshBasicMaterial color="#00f2ff" wireframe :transparent="true" :opacity="0.1" />
    </TresMesh>
    
    <TresPoints :geometry="globeGeometry" :material="globeMaterial" />
  </TresGroup>
  
  <!-- Center Target Crosshair -->
  <TresMesh :position="[0, 0, 2.1]">
      <TresRingGeometry :args="[0.05, 0.06, 32]" />
      <TresMeshBasicMaterial color="#ffffff" :transparent="true" :opacity="0.5" />
  </TresMesh>
</template>
