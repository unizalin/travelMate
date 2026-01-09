<script setup lang="ts">
import AddActivityModal from '@/components/modals/AddActivityModal.vue'
import CountdownTimer from '@/components/trip/CountdownTimer.vue'
import DayCard from '@/components/trip/DayCard.vue'
import EditActivityModal from '@/components/modals/EditActivityModal.vue'
import { weatherService } from '@/services/weatherService'
import { useItineraryStore } from '@/stores/itinerary'
import { useTripStore } from '@/stores/trip'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const tripStore = useTripStore()
const router = useRouter()
const itineraryStore = useItineraryStore()

const currentTrip = computed(() => tripStore.currentTrip)
const itineraries = computed(() => itineraryStore.itineraries)

const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectedActivity = ref<any>(null)
const selectedItineraryId = ref('')
const selectedItineraryOrder = ref(0) // Need to find max order index

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const weatherData = ref<Record<string, any>>({})

function handleAddActivity(itineraryId: string) {
  selectedItineraryId.value = itineraryId

  // Find current max order index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itinerary = itineraries.value.find((i: any) => i.id === itineraryId)
  const maxOrder = itinerary?.activities?.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? Math.max(...itinerary.activities.map((a: any) => a.order_index))
    : -1

  selectedItineraryOrder.value = maxOrder
  isAddModalOpen.value = true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleEditActivity(activity: any) {
  selectedActivity.value = activity
  isEditModalOpen.value = true
}

function handleActivitySuccess() {
  if (currentTrip.value) {
    itineraryStore.fetchItineraries(
      currentTrip.value.id,
      currentTrip.value.start_date,
      currentTrip.value.end_date
    )
  }
  isAddModalOpen.value = false
  isEditModalOpen.value = false
  selectedActivity.value = null
}

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
    itineraryStore.fetchItineraries(
      currentTrip.value.id,
      currentTrip.value.start_date,
      currentTrip.value.end_date
    )
  }
})

watch(() => currentTrip.value, (newTrip) => {
  if (newTrip) {
    fetchWeather()
    itineraryStore.fetchItineraries(
      newTrip.id,
      newTrip.start_date,
      newTrip.end_date
    )
  }
}, { deep: true })
</script>

<template>
  <div class="space-y-6">
    <!-- Countdown Section -->
    <div v-if="currentTrip" class="mb-8">
      <CountdownTimer :target-date="currentTrip.start_date" :end-date="currentTrip.end_date" />
    </div>

    <!-- Weather & Destination Info -->
    <!-- Weather & Destination Info -->
    <div v-if="currentTrip" class="flex items-center gap-3 mb-6">
      <h2 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
         <span>📋</span> 行程概覽
      </h2>
    </div>

    <!-- Itinerary Grid -->
    <div v-if="itineraries.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <DayCard v-for="itinerary in itineraries" :key="itinerary.id" :itinerary="itinerary"
        :weather="weatherData[itinerary.date]" @add-activity="handleAddActivity" @edit-activity="handleEditActivity"
        @click="router.push(`/trips/${currentTrip?.id}/day/${itinerary.day_number}`)" />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
      <p class="text-gray-500">尚未建立行程</p>
    </div>

    <AddActivityModal :is-open="isAddModalOpen" :itinerary-id="selectedItineraryId"
      :current-order="selectedItineraryOrder" @close="isAddModalOpen = false" @success="handleActivitySuccess" />

    <EditActivityModal :is-open="isEditModalOpen" :activity="selectedActivity" @close="isEditModalOpen = false"
      @success="handleActivitySuccess" />
  </div>
</template>
