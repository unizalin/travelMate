<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { preparationService, type PreparationItem } from '@/services/preparationService'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { tripService } from '@/services/tripService'
import { 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  UserIcon, 
  UsersIcon,
  PaperAirplaneIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/vue/24/solid'

const props = defineProps<{
  tripId: string
}>()

const { showToast } = useToast()
const authStore = useAuthStore()
const items = ref<PreparationItem[]>([])
const tripMembers = ref<any[]>([])
const loading = ref(true)
const activeMode = ref<'personal' | 'shared'>('personal')
const editingItemId = ref<string | null>(null)
const editTitle = ref('')
const newItemTitle = ref('')
const filterStatus = ref<'pending' | 'completed'>('pending')

const filteredItems = computed(() => {
  return items.value
    .filter(item => {
      const modeMatch = activeMode.value === 'shared' ? item.is_shared : !item.is_shared
      
      let isItemCompleted = item.is_completed
      if (item.is_shared && tripMembers.value.length > 0) {
        const completionUserIds = item.completions?.map(c => c.user_id) || []
        isItemCompleted = tripMembers.value.every(m => completionUserIds.includes(m.user_id))
      }

      const statusMatch = filterStatus.value === 'completed' ? isItemCompleted : !isItemCompleted
      return modeMatch && statusMatch
    })
    .sort((a, b) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })
})

const modeProgress = computed(() => {
  const modeItems = items.value.filter(item => activeMode.value === 'shared' ? item.is_shared : !item.is_shared)
  if (modeItems.length === 0) return 0
  
  let completedCount = 0
  modeItems.forEach(item => {
    if (item.is_shared && tripMembers.value.length > 0) {
       const completionUserIds = item.completions?.map(c => c.user_id) || []
       if (tripMembers.value.every(m => completionUserIds.includes(m.user_id))) completedCount++
    } else if (item.is_completed) {
      completedCount++
    }
  })

  return Math.round((completedCount / modeItems.length) * 100)
})

async function fetchItems() {
  try {
    loading.value = true
    await preparationService.initializeDefaults(props.tripId)
    items.value = await preparationService.getItems(props.tripId)
    
    // Fetch trip members for status tracking
    const trip = await tripService.getTripById(props.tripId) as any
    tripMembers.value = trip.trip_members
  } catch (error) {
    showToast('無法獲取清單', 'error')
  } finally {
    loading.value = false
  }
}

function isUserCompleted(item: PreparationItem) {
  if (!authStore.user) return false
  if (!item.is_shared) return item.is_completed
  return item.completions?.some(c => c.user_id === authStore.user!.id) || false
}

function isMemberCompleted(item: PreparationItem, userId: string) {
  return item.completions?.some(c => c.user_id === userId) || false
}

async function toggleItem(item: PreparationItem) {
  if (editingItemId.value === item.id) return
  try {
    const isCompleted = isUserCompleted(item)
    const newStatus = !isCompleted
    
    await preparationService.toggleItem(item, newStatus)
    
    // Refresh items to get updated completions from server
    items.value = await preparationService.getItems(props.tripId)
  } catch (error) {
    showToast('更新失敗', 'error')
  }
}

async function handleAddItem() {
  const title = newItemTitle.value.trim()
  if (!title) return

  try {
    const newItem = await preparationService.addItem({
      trip_id: props.tripId,
      category: '其他',
      title,
      is_shared: activeMode.value === 'shared',
      order_index: 0
    })
    items.value.unshift(newItem)
    newItemTitle.value = ''
    showToast('記事已新增', 'success')
  } catch (error) {
    showToast('新增失敗', 'error')
  }
}

function startEditing(item: PreparationItem) {
  editingItemId.value = item.id
  editTitle.value = item.title
}

async function saveEdit(item: PreparationItem) {
  if (!editTitle.value.trim()) {
    editingItemId.value = null
    return
  }
  try {
    await preparationService.updateItem(item.id, { title: editTitle.value })
    item.title = editTitle.value
    editingItemId.value = null
    showToast('已更新', 'success')
  } catch (error) {
    showToast('更新失敗', 'error')
  }
}

async function deleteItem(itemId: string) {
  try {
    await preparationService.deleteItem(itemId)
    items.value = items.value.filter(i => i.id !== itemId)
    showToast('已刪除', 'success')
  } catch (error) {
    showToast('刪除失敗', 'error')
  }
}

onMounted(fetchItems)

const vFocus = {
  mounted: (el: HTMLElement) => el.focus()
}
</script>

<template>
  <div class="preparation-notes mt-10 animate-fade-in font-sans pb-20">
    <!-- Premium Header Area -->
    <div class="flex flex-col lg:flex-row items-start lg:items-end justify-between mb-12 gap-8">
      <div class="space-y-4">
        <h3 class="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
          出發記事本
        </h3>
      </div>

      <div class="flex flex-wrap items-center gap-6">
        <!-- Progress Circular Widget -->
        <div class="flex items-center gap-4 bg-white dark:bg-white/5 p-4 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
          <div class="relative w-14 h-14">
            <svg class="w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" stroke-width="5" class="text-slate-100 dark:text-white/5" />
              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" stroke-width="5" 
                class="text-primary-500 transition-all duration-1000"
                stroke-linecap="round"
                :stroke-dasharray="2 * Math.PI * 24"
                :stroke-dashoffset="2 * Math.PI * 24 * (1 - modeProgress / 100)"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-xs font-black text-slate-900 dark:text-white">{{ modeProgress }}%</span>
            </div>
          </div>
          <div class="pr-2">
            <p class="text-xs font-black text-slate-900 dark:text-white">完成進度</p>
          </div>
        </div>

        <!-- Mode Toggle Switch (iOS Style) -->
        <div class="flex flex-col gap-4">
          <div class="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
            <button 
              @click="activeMode = 'personal'"
              :class="activeMode === 'personal' ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-white shadow-xl' : 'text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/60'"
              class="flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <UserIcon class="w-4 h-4" />
              個人私有
            </button>
            <button 
              @click="activeMode = 'shared'"
              :class="activeMode === 'shared' ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-white shadow-xl' : 'text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/60'"
              class="flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <UsersIcon class="w-4 h-4" />
              團體共用
            </button>
          </div>

          <!-- Status Filter Tabs -->
          <div class="flex justify-center lg:justify-end gap-6 px-2">
            <button 
              @click="filterStatus = 'pending'"
              class="text-[10px] font-black uppercase tracking-[0.2em] transition-all relative pb-2"
              :class="filterStatus === 'pending' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-300 dark:text-white/20 hover:text-slate-500'"
            >
              未完成
              <div v-if="filterStatus === 'pending'" class="absolute bottom-0 left-0 right-0 h-1 bg-primary-500 rounded-full animate-slide-right"></div>
            </button>
            <button 
              @click="filterStatus = 'completed'"
              class="text-[10px] font-black uppercase tracking-[0.2em] transition-all relative pb-2"
              :class="filterStatus === 'completed' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-300 dark:text-white/20 hover:text-slate-500'"
            >
              已完成
              <div v-if="filterStatus === 'completed'" class="absolute bottom-0 left-0 right-0 h-1 bg-primary-500 rounded-full animate-slide-right"></div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Minimal Input Area -->
    <div class="max-w-3xl mx-auto mb-16 relative">
      <div class="relative bg-white dark:bg-white/5 p-2 rounded-2.5xl border-2 border-slate-100 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-3xl flex items-center group focus-within:border-primary-500/50 transition-all">
        <div class="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-secondary-900 flex items-center justify-center text-slate-400 dark:text-white/20 group-focus-within:text-primary-500 transition-colors">
          <PlusIcon class="w-6 h-6" />
        </div>
        <input 
          v-model="newItemTitle"
          type="text" 
          :placeholder="activeMode === 'shared' ? '建立一項團隊共用記事...' : '紀錄個人的準備事項...'"
          class="flex-1 py-6 px-2 bg-transparent border-none text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 outline-none"
          @keyup.enter="handleAddItem"
        />
        <button 
          @click="handleAddItem"
          :disabled="!newItemTitle.trim()"
          class="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-secondary-900 text-[10px] font-black rounded-2xl transition-all disabled:opacity-20 uppercase tracking-widest active:scale-95 shadow-xl"
        >
          <PaperAirplaneIcon class="w-4 h-4" />
          新增
        </button>
      </div>
    </div>

    <!-- List Layout -->
    <div class="max-w-3xl mx-auto space-y-3">
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="h-24 bg-slate-100 dark:bg-white/5 animate-pulse rounded-[2rem]"></div>
      </div>

      <div v-else-if="filteredItems.length === 0" class="py-20 text-center bg-slate-50 dark:bg-white/5 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-white/5 shadow-inner">
         <div class="w-20 h-20 bg-slate-100 dark:bg-white/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-slate-300 dark:text-white/10">
           <PaperAirplaneIcon class="w-10 h-10 -rotate-45" />
         </div>
         <h5 class="text-xl font-black text-slate-900 dark:text-white mb-2">清單目前部署完成</h5>
         <p class="text-sm font-medium text-slate-400 dark:text-white/20">輸入指令來新增新的準備項目</p>
      </div>

      <div v-else class="grid gap-3 animate-fade-in">
        <div 
          v-for="item in filteredItems" 
          :key="item.id"
          class="group/item relative bg-white dark:bg-white/5 p-6 rounded-[2.2rem] border border-slate-100 dark:border-white/5 hover:border-primary-200 dark:hover:border-primary-500/50 transition-all duration-500 overflow-hidden flex items-center justify-between gap-6 hover:shadow-2xl hover:shadow-primary-100/30 dark:shadow-none"
          :class="isUserCompleted(item) ? 'bg-slate-50/50 dark:bg-white/2' : ''"
        >
          <!-- Left side -->
          <div class="flex items-center gap-6 flex-1 min-w-0">
            <button 
              @click="toggleItem(item)"
              class="w-8 h-8 flex-shrink-0 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center relative shadow-sm"
              :class="isUserCompleted(item) ? 'bg-emerald-500 border-emerald-500 scale-100 shadow-emerald-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 group-hover/item:border-primary-400 scale-95 hover:scale-105'"
            >
              <CheckCircleSolid v-if="isUserCompleted(item)" class="w-5 h-5 text-white animate-pop-in" />
              <div v-else class="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 group-hover/item:bg-primary-300 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
            </button>

            <div class="flex-1 min-w-0">
              <div v-if="editingItemId === item.id" class="flex items-center pr-4">
                <input 
                  v-model="editTitle"
                  @keyup.enter="saveEdit(item)"
                  @blur="saveEdit(item)"
                  v-focus
                  class="w-full bg-transparent border-none focus:ring-0 text-slate-700 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 font-black tracking-tight py-4"
                />
              </div>
              <div v-else class="flex flex-col group/text" @click="toggleItem(item)">
                <span 
                  class="text-base font-black transition-all cursor-pointer truncate tracking-tight pr-4"
                  :class="isUserCompleted(item) ? 'text-slate-300 dark:text-white/20 line-through decoration-slate-200/50 dark:decoration-white/10 decoration-[2px]' : 'text-slate-800 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white'"
                >
                  {{ item.title }}
                </span>

                <div v-if="activeMode === 'shared' && tripMembers.length > 0" class="flex items-center gap-1.5 mt-2.5">
                   <div v-for="member in tripMembers" :key="member.user_id" class="relative">
                      <img 
                        :src="member.profiles.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.profiles.display_name)}&background=random`"
                        class="w-6 h-6 rounded-full border-2 transition-all duration-500"
                        :class="isMemberCompleted(item, member.user_id) ? 'border-primary-400 scale-110 shadow-sm' : 'border-slate-100 dark:border-white/5 grayscale opacity-30 scale-90'"
                        :title="member.profiles.display_name"
                      />
                      <div v-if="isMemberCompleted(item, member.user_id)" class="absolute -top-1 -right-1 bg-primary-500 rounded-full p-0.5 shadow-sm border border-white dark:border-secondary-900">
                        <CheckIcon class="w-1.5 h-1.5 text-white" />
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 transition-all translate-x-4 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100">
            <button 
              @click.stop="startEditing(item)"
              class="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-400 dark:text-white/40 hover:text-primary-600 dark:hover:text-primary-400 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/10 shadow-sm hover:shadow-md"
            >
              <PencilSquareIcon class="w-4 h-4" />
            </button>
            <button 
              @click.stop="deleteItem(item.id)"
              class="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-400 dark:text-white/40 hover:text-red-600 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/10 shadow-sm hover:shadow-md"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>

          <!-- Highlight Decoration -->
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover/item:bg-primary-500 transition-all duration-500"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-sans {
  font-family: 'Outfit', sans-serif, "Microsoft JhengHei", "微軟正黑體";
}

@keyframes pop-in {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.animate-pop-in {
  animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes slide-right {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.animate-slide-right {
  animation: slide-right 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.decoration-2 {
  text-decoration-thickness: 2px;
}
</style>
