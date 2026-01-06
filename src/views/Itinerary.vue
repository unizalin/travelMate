<script setup lang="ts">
import CountdownTimer from '@/components/CountdownTimer.vue'
import DayCard from '@/components/DayCard.vue'
import { weatherService } from '@/services/weatherService'
import { useItineraryStore } from '@/stores/itinerary'
import { useTripStore } from '@/stores/trip'
import { computed, onMounted, ref, watch } from 'vue'

const tripStore = useTripStore()
const itineraryStore = useItineraryStore()

const currentTrip = computed(() => tripStore.currentTrip)
const itineraries = computed(() => itineraryStore.itineraries)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const weatherData = ref<Record<string, any>>({})

async function fetchWeather() {
  if (!currentTrip.value?.destination) return

  // 1. Get coordinates
  const coords = await weatherService.getCoordinates(currentTrip.value.destination)
  if (coords) {
    // 2. Get forecast
    weatherData.value = await weatherService.getForecast(coords.lat, coords.lon)
  }
}

onMounted(() => {
  if (currentTrip.value) {
    fetchWeather()
  }
})

watch(() => currentTrip.value?.destination, () => {
  fetchWeather()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Countdown Section -->
    <div v-if="currentTrip" class="mb-8">
      <CountdownTimer
        :target-date="currentTrip.start_date"
        :end-date="currentTrip.end_date"
      />
    </div>

    <!-- Weather & Destination Info -->
    <div v-if="currentTrip" class="flex items-center justify-between">
      <h2 class="text-xl font-bold text-gray-900">行程概覽</h2>
      <div v-if="currentTrip.destination" class="text-sm text-gray-500 flex items-center">
        <span class="mr-2">📍 {{ currentTrip.destination }}</span>
      </div>
    </div>

    <!-- Itinerary Grid -->
    <div v-if="itineraries.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DayCard
        v-for="itinerary in itineraries"
        :key="itinerary.id"
        :itinerary="itinerary"
        :weather="weatherData[itinerary.date]"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
        <p class="text-gray-500">尚未建立行程</p>
    </div>
  </div>
</template>
