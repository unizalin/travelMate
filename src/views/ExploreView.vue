<template>
  <div class="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-gray-900">
    <!-- Map Layer -->
    <WorldMap class="absolute inset-0 z-0" />

    <!-- Controls Overlay -->
    <div class="absolute top-6 left-6 z-10 w-full max-w-sm pointer-events-none">
        <div class="pointer-events-auto">
            <DartControls />
        </div>
    </div>
    
    <!-- Optional: Bottom Sheet or Side Panel for itinerary preview could be added here -->
  </div>
</template>

<script setup lang="ts">
import WorldMap from '@/components/map/WorldMap.vue'
import DartControls from '@/components/map/DartControls.vue'
</script>
