<template>
  <div class="space-y-10 animate-fade-in">
    <!-- Weather & Destination Info -->
    <div v-if="currentTrip" class="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
      <div>
        <div class="flex items-center gap-4 mb-6">
             <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 shadow-2xl transition-all group-hover:bg-primary-500 group-hover:text-white">
                <CalendarIcon class="w-6 h-6" />
             </div>
             <h2 class="text-3xl font-black text-white uppercase tracking-tighter">行程規劃</h2>
        </div>
        <p class="text-white/30 text-sm font-bold leading-relaxed max-w-2xl transition-all">
            正在優化 <span class="text-primary-400 font-black">{{ currentTrip.destination }}</span> 的旅行計畫。已自動為您整理 {{ itineraries.length }} 天的完美行程。
        </p>
      </div>
      
      <div class="flex flex-wrap items-center gap-6">
        <button 
          @click="generateSmartSchedule"
          :disabled="isScheduling || itineraries.length === 0"
          class="group relative px-8 py-4 bg-white text-secondary-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-2xl hover:bg-primary-500 hover:text-white active:scale-95 disabled:opacity-20 overflow-hidden"
        >
            <div class="relative z-10 flex items-center gap-3">
                <SparklesIcon class="w-4 h-4" :class="{'animate-spin-slow': isScheduling}" />
                {{ isScheduling ? '智慧分析中...' : '智慧排程' }}
            </div>
            <div class="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/30 to-primary-500/0 -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
        </button>

        <div class="px-6 py-3 rounded-2xl bg-secondary-900/60 border border-white/10 backdrop-blur-3xl flex items-center gap-4 shadow-2xl ring-1 ring-white/5 transition-all">
            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">已配置 {{ itineraries.length }} 天行程</span>
        </div>
      </div>
    </div>

    <!-- Itinerary Grid -->
    <div v-if="itineraries.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
      <DayCard v-for="itinerary in itineraries" :key="itinerary.id" :itinerary="itinerary"
        :weather="weatherData[itinerary.date]" @add-activity="handleAddActivity" @edit-activity="handleEditActivity"
        @click="router.push(`/trips/${currentTrip?.id}/itinerary/${itinerary.day_number}`)" 
        class="hover:-translate-y-4 transition-all duration-700 hover:rotate-1"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-40 bg-secondary-900/40 rounded-[4rem] border border-white/5 backdrop-blur-3xl text-center shadow-[0_50px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5 transition-all">
      <div class="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/10 mb-10 transition-all shadow-2xl">
        <ArchiveBoxIcon class="w-12 h-12" />
      </div>
      <p class="text-xl font-black text-white/20 uppercase tracking-[0.5em] animate-pulse">暫無行程數據</p>
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
    ArchiveBoxIcon,
    SparklesIcon
} from '@heroicons/vue/24/outline'
import { aiSchedulingService } from '@/services/aiSchedulingService'
import { candidateService } from '@/services/candidateService'
import { useToast } from '@/composables/useToast'

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
const isScheduling = ref(false)
const { showToast } = useToast()

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

async function generateSmartSchedule() {
    if (!currentTrip.value || itineraries.value.length === 0) return

    try {
        isScheduling.value = true
        // 1. Fetch wishlist candidates
        const candidates = await candidateService.getCandidates(currentTrip.value.id)
        const wishlistCandidates = candidates.filter((c: any) => c.status === 'pending')

        if (wishlistCandidates.length === 0) {
            showToast('願望清單目前沒有待安排的景點', 'info')
            return
        }

        // 2. Get AI suggestions
        const suggestions = await aiSchedulingService.getSmartSchedule(wishlistCandidates, {
            destination: currentTrip.value.destination,
            startDate: currentTrip.value.start_date,
            endDate: currentTrip.value.end_date,
            totalDays: itineraries.value.length
        })

        if (suggestions.length === 0) {
            showToast('AI 無法生成合適的排程建議', 'warning')
            return
        }

        // 3. Process suggestions and add to itineraries
        let addedCount = 0
        for (const sug of suggestions) {
            const targetItinerary = itineraries.value.find(i => i.day_number === sug.dayNumber)
            const candidate = wishlistCandidates.find((c: any) => c.id === sug.candidateId)

            if (targetItinerary && candidate) {
                await itineraryStore.createActivity({
                    itinerary_id: targetItinerary.id,
                    name: candidate.name,
                    location: candidate.location,
                    start_time: sug.startTime,
                    notes: sug.reasoning || candidate.description,
                    order_index: targetItinerary.activities?.length || 0
                })

                await candidateService.updateCandidate(candidate.id, {
                    status: 'added',
                    added_to_day: sug.dayNumber,
                    added_at: new Date().toISOString()
                })
                addedCount++
            }
        }

        showToast(`成功自動安排 ${addedCount} 個景點！`, 'success')
        itineraryStore.fetchItineraries(currentTrip.value.id)
    } catch (e: any) {
        console.error('Smart schedule failed:', e)
        showToast('智慧排程失敗：' + (e.message || '未知錯誤'), 'error')
    } finally {
        isScheduling.value = false
    }
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
