<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { candidateService, type CandidateActivity } from '@/services/candidateService'
import { aiSchedulingService, type SchedulingSuggestion } from '@/services/aiSchedulingService'
import CandidateCard from '@/components/candidate/CandidateCard.vue'
import AddCandidateModal from '@/components/candidate/AddCandidateModal.vue'
import AIScheduleModal from '@/components/candidate/AIScheduleModal.vue'
import DayPickerModal from '@/components/candidate/DayPickerModal.vue'
import NearbySearchModal from '@/components/candidate/NearbySearchModal.vue'
import { 
  PlusIcon, 
  SparklesIcon, 
  ArrowsUpDownIcon,
  ArchiveBoxIcon,
  MapPinIcon
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
const isNearbyModalOpen = ref(false)
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
  <div class="space-y-12 py-8 min-h-screen">
    <!-- View Header (Filter & Sort) -->
    <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
      <!-- Filter Segmented Control -->
      <div class="w-full xl:w-auto overflow-x-auto no-scrollbar pb-2 xl:pb-0">
        <div class="inline-flex items-center gap-2 p-1.5 bg-white/50 dark:bg-white/5 backdrop-blur-3xl rounded-[1.5rem] border border-slate-200 dark:border-white/10 shadow-xl min-w-max">
          <button 
            @click="filterStatus = 'all'"
            :class="filterStatus === 'all' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' : 'text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white'"
            class="px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            全部地標
          </button>
          <button 
            @click="filterStatus = 'pending'"
            :class="filterStatus === 'pending' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' : 'text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white'"
            class="px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            待部署
          </button>
          <button 
            @click="filterStatus = 'added'"
            :class="filterStatus === 'added' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white'"
            class="px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            已部署
          </button>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="w-full xl:w-auto flex flex-wrap items-center gap-3">
        <!-- Sort Dropdown -->
        <div class="flex items-center gap-2 px-4 py-2.5 bg-white/50 dark:bg-white/5 backdrop-blur-3xl rounded-xl border border-slate-200 dark:border-white/10 shadow-lg group">
          <ArrowsUpDownIcon class="w-3.5 h-3.5 text-slate-300 dark:text-white/20 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
          <select v-model="sortBy" class="bg-transparent border-none text-[9px] font-black text-slate-600 dark:text-white/60 outline-none uppercase tracking-widest cursor-pointer appearance-none">
            <option value="newest" class="bg-white dark:bg-secondary-900 text-slate-900 dark:text-white">最新收錄</option>
            <option value="likes" class="bg-white dark:bg-secondary-900 text-slate-900 dark:text-white">最高評價</option>
            <option value="name" class="bg-white dark:bg-secondary-900 text-slate-900 dark:text-white">名稱排序</option>
          </select>
        </div>

        <div class="flex items-center gap-2 flex-1 sm:flex-none">
          <button 
            @click="isNearbyModalOpen = true"
            class="flex-1 sm:flex-none group flex items-center justify-center gap-2 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-2.5 rounded-xl shadow-lg hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95"
          >
            <MapPinIcon class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span class="text-[9px] font-black text-slate-500 dark:text-white/60 uppercase tracking-widest">
              偵測周邊
            </span>
          </button>

          <button 
            @click="handleAISchedule"
            :disabled="isScheduling || filteredItems.length === 0"
            class="flex-1 sm:flex-none group relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-5 py-2.5 rounded-xl shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all active:scale-95 disabled:grayscale disabled:opacity-30"
          >
            <div class="flex items-center justify-center gap-2 relative z-10 text-white">
              <SparklesIcon class="w-3.5 h-3.5 animate-pulse" />
              <span class="text-[9px] font-black uppercase tracking-widest">
                {{ isScheduling ? 'Analyzing...' : 'AI 排程' }}
              </span>
            </div>
          </button>

          <button 
            @click="isAddModalOpen = true"
            class="bg-slate-900 dark:bg-white text-white dark:text-secondary-900 p-2.5 rounded-xl shadow-xl hover:scale-110 active:scale-95 transition-all"
          >
            <PlusIcon class="w-5 h-5 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Panel (Optional Decoration) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <div 
            v-for="(stat, label) in { 'Total Hubs': items.length, 'Pending': items.filter(i => i.status === 'pending').length, 'Deployed': items.filter(i => i.status === 'added').length, 'AI Ready': 1 }"
            :key="label"
            class="bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center backdrop-blur-xl"
        >
            <span class="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/20 mb-1">{{ label }}</span>
            <span class="text-xl font-mono font-black text-primary-600 dark:text-primary-500">{{ stat }}</span>
        </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && filteredItems.length === 0" class="flex flex-col items-center justify-center py-24 px-6 text-center bg-white/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-xl">
      <div class="w-24 h-24 rounded-[2.5rem] bg-slate-100 dark:bg-secondary-900 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-300 dark:text-white/10 mb-8 relative group">
        <ArchiveBoxIcon class="w-12 h-12 group-hover:scale-110 transition-transform" />
        <div class="absolute inset-0 bg-primary-500/10 dark:bg-primary-500/10 blur-3xl rounded-full"></div>
      </div>
      <h4 class="text-2xl font-black text-slate-900 dark:text-white mb-4">資料庫目前為空</h4>
      <p class="text-sm font-medium text-slate-400 dark:text-white/30 max-w-xs mx-auto mb-10 leading-relaxed">啟動地標收藏模組，將您感興趣的目的地加入願望清單，讓 AI 為您打造完美旅程。</p>
      <button @click="isAddModalOpen = true" class="px-8 py-3.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all">手動新增地標</button>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
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

    <NearbySearchModal 
      :is-open="isNearbyModalOpen"
      :trip-id="tripId"
      @close="isNearbyModalOpen = false"
      @added="fetchCandidates"
    />
  </div>
</template>
