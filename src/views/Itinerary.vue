<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Weather & Destination Info -->
    <div v-if="currentTrip" class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
      <div>
        <div class="flex items-center gap-3 mb-4">
             <div class="w-10 h-10 rounded-2xl bg-primary-600/10 border border-primary-500/20 flex items-center justify-center text-primary-500">
                <CalendarIcon class="w-6 h-6" />
             </div>
             <h2 class="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">行程概覽</h2>
        </div>
        <p class="text-slate-500 dark:text-white/40 text-sm font-medium leading-relaxed max-w-xl">
            正在瀏覽 <span class="text-primary-600 dark:text-primary-400 font-black">{{ currentTrip.destination }}</span> 的數據節點，已自動分析並部署 {{ itineraries.length }} 天的時空序列
        </p>
      </div>
      
      <div class="flex items-center gap-4">
        <div class="px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md flex items-center gap-2 shadow-sm">
            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/60">{{ itineraries.length }} Days Configured</span>
        </div>
      </div>
    </div>

    <!-- Itinerary Grid -->
    <div v-if="itineraries.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8">
      <DayCard v-for="itinerary in itineraries" :key="itinerary.id" :itinerary="itinerary"
        :weather="weatherData[itinerary.date]" @add-activity="handleAddActivity" @edit-activity="handleEditActivity"
        @click="router.push(`/trips/${currentTrip?.id}/itinerary/${itinerary.day_number}`)" 
        class="hover:-translate-y-2 transition-transform duration-500"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-24 bg-white/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10 backdrop-blur-2xl text-center shadow-xl">
      <div class="w-20 h-20 rounded-[2rem] bg-slate-100 dark:bg-secondary-900 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-300 dark:text-white/10 mb-6">
        <ArchiveBoxIcon class="w-10 h-10" />
      </div>
      <p class="text-lg font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">暫時沒有數據</p>
    </div>

    <AddActivityModal :is-open="isAddModalOpen" :itinerary-id="selectedItineraryId"
      :current-order="selectedItineraryOrder" @close="isAddModalOpen = false" @success="handleActivitySuccess" />

    <EditActivityModal :is-open="isEditModalOpen" :activity="selectedActivity" @close="isEditModalOpen = false"
      @success="handleActivitySuccess" />
  </div>
</template>

<script setup lang="ts">
import AddActivityModal from '@/components/modals/AddActivityModal.vue'
import DayCard from '@/components/trip/DayCard.vue'
import EditActivityModal from '@/components/modals/EditActivityModal.vue'
import { weatherService } from '@/services/weatherService'
import { useItineraryStore } from '@/stores/itinerary'
import { useTripStore } from '@/stores/trip'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
    CalendarIcon, 
    ArchiveBoxIcon 
} from '@heroicons/vue/24/outline'

const tripStore = useTripStore()
const router = useRouter()
const itineraryStore = useItineraryStore()

const currentTrip = computed(() => tripStore.currentTrip)
const itineraries = computed(() => itineraryStore.itineraries)

const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedActivity = ref<any>(null)
const selectedItineraryId = ref('')
const selectedItineraryOrder = ref(0)
const weatherData = ref<Record<string, any>>({})

function handleAddActivity(itineraryId: string) {
  selectedItineraryId.value = itineraryId
  const itinerary = itineraries.value.find((i: any) => i && i.id === itineraryId)
  const maxOrder = itinerary?.activities?.length
    ? Math.max(...itinerary.activities.map((a: any) => a.order_index))
    : -1

  selectedItineraryOrder.value = maxOrder
  isAddModalOpen.value = true
}

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
  const coords = await weatherService.getCoordinates(currentTrip.value.destination)
  if (coords) {
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
