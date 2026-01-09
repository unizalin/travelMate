<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  weather?: {
    temp: number
    description: string
    icon: string
  }
}>()

const iconUrl = computed(() => 
  props.weather ? `https://openweathermap.org/img/wn/${props.weather.icon}@2x.png` : ''
)
</script>

<template>
  <div v-if="weather" class="flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded-full text-xs text-blue-700 border border-blue-100" title="天氣預報">
    <img :src="iconUrl" :alt="weather.description" class="w-6 h-6" />
    <span class="font-medium">{{ Math.round(weather.temp) }}°C</span>
    <span class="hidden sm:inline text-blue-500">{{ weather.description }}</span>
  </div>
</template>
