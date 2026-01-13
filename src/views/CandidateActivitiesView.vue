<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { candidateService, type CandidateActivity } from '@/services/candidateService'
import { aiSchedulingService, type SchedulingSuggestion } from '@/services/aiSchedulingService'
import CandidateCard from '@/components/candidate/CandidateCard.vue'
import AddCandidateModal from '@/components/candidate/AddCandidateModal.vue'
import AIScheduleModal from '@/components/candidate/AIScheduleModal.vue'
import DayPickerModal from '@/components/candidate/DayPickerModal.vue'
import { 
  PlusIcon, 
  SparklesIcon, 
  ArrowsUpDownIcon,
  ArchiveBoxIcon
} from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'
import { useDialog } from '@/composables/useDialog'
import { useItineraryStore } from '@/stores/itinerary'

const props = defineProps<{
  tripId: string
  tripInfo: {
    destination: string
    startDate: string
    endDate: string
    totalDays: number
  }
}>()

const items = ref<CandidateActivity[]>([])
const loading = ref(true)
const isAddModalOpen = ref(false)
const isAIModalOpen = ref(false)
const isDayPickerOpen = ref(false)
const selectedCandidate = ref<CandidateActivity | null>(null)
const aiSuggestions = ref<SchedulingSuggestion[]>([])
const isScheduling = ref(false)

const filterStatus = ref<'all' | 'pending' | 'added'>('all')
const sortBy = ref<'newest' | 'likes' | 'name'>('newest')

const { showToast } = useToast()
const { openDeleteDialog } = useDialog()
const itineraryStore = useItineraryStore()

async function fetchCandidates() {
  try {
    loading.value = true
    items.value = await candidateService.getCandidates(props.tripId)
  } catch (error) {
    showToast('無法讀取候選景點', 'error')
  } finally {
    loading.value = false
  }
}

const filteredItems = computed(() => {
  let result = [...items.value]
  
  // Filter
  if (filterStatus.value !== 'all') {
    result = result.filter(i => i.status === filterStatus.value)
  }
  
  // Sort
  if (sortBy.value === 'newest') {
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else if (sortBy.value === 'likes') {
    result.sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
  } else if (sortBy.value === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name))
  }
  
  return result
})

async function handleAISchedule() {
  const pendingItems = items.value.filter(i => i.status === 'pending')
  if (pendingItems.length === 0) {
    showToast('沒有待處理的候選景點', 'info')
    return
  }

  try {
    isScheduling.value = true
    const suggestions = await aiSchedulingService.getSmartSchedule(pendingItems, props.tripId as any ? props.tripInfo : props.tripInfo)
    aiSuggestions.value = suggestions
    isAIModalOpen.value = true
  } catch (error) {
    showToast('AI 排程失敗，請稍後再試', 'error')
  } finally {
    isScheduling.value = false
  }
}

async function applySuggestions(suggestions: SchedulingSuggestion[]) {
  try {
    for (const s of suggestions) {
      const candidate = items.value.find(c => c.id === s.candidateId)
      if (candidate) {
        // Find itinerary day
        const itineraries = itineraryStore.itineraries
        const day = itineraries.find(i => i.day_number === s.dayNumber)
        if (day) {
          // Add to itinerary
          await itineraryStore.createActivity({
            itinerary_id: day.id,
            name: candidate.name,
            location: candidate.location,
            start_time: s.startTime,
            notes: candidate.description
          })
          
          // Mark candidate as added
          await candidateService.updateCandidate(candidate.id, {
            status: 'added',
            added_to_day: s.dayNumber,
            added_at: new Date().toISOString()
          })
        }
      }
    }
    showToast(`已成功套用 ${suggestions.length} 個排程！`, 'success')
    await fetchCandidates()
    isAIModalOpen.value = false
  } catch (error) {
    showToast('套用排程時發生錯誤', 'error')
  }
}

function handleAddToItinerary(candidate: CandidateActivity) {
  selectedCandidate.value = candidate
  isDayPickerOpen.value = true
}

async function onDaySelected(dayNum: number) {
  if (!selectedCandidate.value) return
  
  try {
    const candidate = selectedCandidate.value
    const itineraries = itineraryStore.itineraries
    const targetDay = itineraries.find(i => i.day_number === dayNum)
    if (targetDay) {
      await itineraryStore.createActivity({
        itinerary_id: targetDay.id,
        name: candidate.name,
        location: candidate.location,
        notes: candidate.description
      })
      await candidateService.updateCandidate(candidate.id, {
        status: 'added',
        added_to_day: dayNum,
        added_at: new Date().toISOString()
      })
      showToast('已加入日程！', 'success')
      await fetchCandidates()
    }
  } catch (error) {
    showToast('新增失敗', 'error')
  }
}

async function handleDelete(id: string) {
  const confirmed = await openDeleteDialog('移除景點', '確定要從願望清單中移除這個景點嗎？')
  if (confirmed) {
    try {
      await candidateService.deleteCandidate(id)
      items.value = items.value.filter(i => i.id !== id)
      showToast('已移除', 'success')
    } catch (error) {
      showToast('移除失敗', 'error')
    }
  }
}

onMounted(fetchCandidates)
</script>

<template>
  <div class="space-y-10 py-6">
    <!-- View Header (Filter & Sort) -->
    <div class="flex flex-col md:flex-row justify-between items-center gap-6">
      <div class="flex items-center gap-3">
        <button 
          @click="filterStatus = 'all'"
          :class="filterStatus === 'all' ? 'bg-secondary-900 text-white shadow-xl shadow-secondary-100' : 'bg-white text-secondary-500 hover:bg-secondary-50'"
          class="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
        >
          全部
        </button>
        <button 
          @click="filterStatus = 'pending'"
          :class="filterStatus === 'pending' ? 'bg-primary-600 text-white shadow-xl shadow-primary-100' : 'bg-white text-secondary-500 hover:bg-secondary-50'"
          class="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
        >
          未加入
        </button>
        <button 
          @click="filterStatus = 'added'"
          :class="filterStatus === 'added' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-100' : 'bg-white text-secondary-500 hover:bg-secondary-50'"
          class="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
        >
          已加入
        </button>
      </div>

      <div class="flex items-center gap-4">
        <!-- Sort Dropdown -->
        <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-secondary-50">
          <ArrowsUpDownIcon class="w-4 h-4 text-secondary-300" />
          <select v-model="sortBy" class="bg-transparent border-none text-xs font-black text-secondary-600 outline-none uppercase tracking-widest cursor-pointer">
            <option value="newest">最新添加</option>
            <option value="likes">最多點讚</option>
            <option value="name">按名稱</option>
          </select>
        </div>

        <!-- AI Button -->
        <button 
          @click="handleAISchedule"
          :disabled="isScheduling || filteredItems.length === 0"
          class="group relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-6 py-3 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
        >
          <div class="flex items-center gap-2 relative z-10">
            <SparklesIcon class="w-4 h-4 text-white animate-pulse" />
            <span class="text-xs font-black text-white uppercase tracking-widest">
              {{ isScheduling ? 'AI 分析中...' : 'AI 智能排程' }}
            </span>
          </div>
          <!-- Shimmer effect -->
          <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        </button>

        <!-- Add Button -->
        <button 
          @click="isAddModalOpen = true"
          class="bg-secondary-900 hover:bg-black text-white p-3 rounded-2xl shadow-xl shadow-secondary-100 transition-all active:scale-95"
        >
          <PlusIcon class="w-6 h-6 stroke-[3]" />
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && filteredItems.length === 0" class="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div class="w-24 h-24 rounded-[2rem] bg-secondary-50 flex items-center justify-center text-secondary-200 mb-6">
        <ArchiveBoxIcon class="w-12 h-12" />
      </div>
      <h4 class="text-xl font-black text-secondary-900 mb-2">願望清單目前空空如也</h4>
      <p class="text-sm font-medium text-secondary-400 max-w-xs mx-auto">點擊加號按鈕，收集想去的地方，讓旅程更豐富！</p>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <CandidateCard 
        v-for="item in filteredItems" 
        :key="item.id" 
        :candidate="item"
        @update="fetchCandidates"
        @delete="handleDelete"
        @add-to-itinerary="handleAddToItinerary"
      />
    </div>

    <!-- Modals -->
    <AddCandidateModal 
      :is-open="isAddModalOpen" 
      :trip-id="tripId"
      @close="isAddModalOpen = false"
      @added="fetchCandidates"
    />

    <AIScheduleModal 
      :is-open="isAIModalOpen"
      :suggestions="aiSuggestions"
      :candidates="items"
      @close="isAIModalOpen = false"
      @apply="applySuggestions"
    />

    <DayPickerModal 
      :is-open="isDayPickerOpen"
      :total-days="tripInfo.totalDays"
      :candidate-name="selectedCandidate?.name || ''"
      @close="isDayPickerOpen = false"
      @select="onDaySelected"
    />
  </div>
</template>
