<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { preparationService, type PreparationItem } from '@/services/preparationService'
import { useToast } from '@/composables/useToast'
import { 
  CheckCircleIcon, 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  UserIcon, 
  UsersIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  PaperAirplaneIcon
} from '@heroicons/vue/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/vue/24/solid'

const props = defineProps<{
  tripId: string
}>()

const { showToast } = useToast()
const items = ref<PreparationItem[]>([])
const loading = ref(true)
const activeMode = ref<'personal' | 'shared'>('personal')
const editingItemId = ref<string | null>(null)
const editTitle = ref('')
const newItemTitle = ref('')

const filteredItems = computed(() => {
  return items.value
    .filter(item => activeMode.value === 'shared' ? item.is_shared : !item.is_shared)
    .sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })
})

const modeProgress = computed(() => {
  const modeItems = items.value.filter(item => activeMode.value === 'shared' ? item.is_shared : !item.is_shared)
  if (modeItems.length === 0) return 0
  const completed = modeItems.filter(i => i.is_completed).length
  return Math.round((completed / modeItems.length) * 100)
})

async function fetchItems() {
  try {
    loading.value = true
    await preparationService.initializeDefaults(props.tripId)
    items.value = await preparationService.getItems(props.tripId)
  } catch (error) {
    showToast('無法獲取清單', 'error')
  } finally {
    loading.value = false
  }
}

async function toggleItem(item: PreparationItem) {
  if (editingItemId.value === item.id) return
  try {
    const newStatus = !item.is_completed
    await preparationService.toggleItem(item.id, newStatus)
    
    item.is_completed = newStatus
    if (newStatus && activeMode.value === 'shared') {
      items.value = await preparationService.getItems(props.tripId)
    } else if (!newStatus) {
      item.completed_by = undefined
      item.completed_by_id = null
    }
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
        <div class="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] animate-slide-right">
          <DocumentTextIcon class="w-3 h-3" />
          Departure Logistics
        </div>
        <h3 class="text-4xl font-black text-secondary-900 tracking-tighter leading-none">
          出發記事本
        </h3>
        <p class="text-sm text-secondary-400 font-bold max-w-md leading-relaxed">
          {{ activeMode === 'personal' ? '您的私人準備清單，僅供個人瀏覽。' : '與全體旅伴共同維護的物資與事項清單。' }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-6">
        <!-- Progress Circular Widget -->
        <div class="flex items-center gap-4 bg-white p-4 rounded-[2rem] border border-secondary-100 shadow-sm hover:shadow-md transition-all">
          <div class="relative w-14 h-14">
            <svg class="w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="24" fill="none" stroke="#f1f5f9" stroke-width="5" />
              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" stroke-width="5" 
                class="text-primary-500 transition-all duration-1000"
                stroke-linecap="round"
                :stroke-dasharray="2 * Math.PI * 24"
                :stroke-dashoffset="2 * Math.PI * 24 * (1 - modeProgress / 100)"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-xs font-black text-secondary-900">{{ modeProgress }}%</span>
            </div>
          </div>
          <div class="pr-2">
            <p class="text-[9px] font-black text-secondary-300 uppercase tracking-widest leading-none mb-1">Total Progress</p>
            <p class="text-xs font-black text-secondary-900">完成進度</p>
          </div>
        </div>

        <!-- Mode Toggle Switch (iOS Style) -->
        <div class="flex bg-secondary-50 p-1.5 rounded-[1.5rem] border border-secondary-100 shadow-inner">
          <button 
            @click="activeMode = 'personal'"
            class="flex items-center gap-2 px-6 py-3 text-xs font-black rounded-2xl transition-all uppercase tracking-widest group"
            :class="activeMode === 'personal' ? 'bg-white text-primary-600 shadow-xl ring-1 ring-secondary-100' : 'text-secondary-400 hover:text-secondary-600'"
          >
            <UserIcon class="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            個人私有
          </button>
          <button 
            @click="activeMode = 'shared'"
            class="flex items-center gap-2 px-6 py-3 text-xs font-black rounded-2xl transition-all uppercase tracking-widest group"
            :class="activeMode === 'shared' ? 'bg-white text-primary-600 shadow-xl ring-1 ring-secondary-100' : 'text-secondary-400 hover:text-secondary-600'"
          >
            <UsersIcon class="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            團體共用
          </button>
        </div>
      </div>
    </div>

    <!-- Minimal Input Area (Float Design) -->
    <div class="max-w-3xl mx-auto mb-16 relative">
      <div class="group bg-white rounded-[2.5rem] shadow-2xl shadow-secondary-100/50 border border-secondary-50 overflow-hidden focus-within:ring-4 focus-within:ring-primary-500/10 transition-all">
        <div class="flex items-center px-6 py-1">
          <div class="w-10 h-10 flex items-center justify-center text-primary-400">
             <PlusIcon class="w-6 h-6" />
          </div>
          <input 
            v-model="newItemTitle"
            type="text" 
            :placeholder="activeMode === 'shared' ? '建立一項團隊共用記事...' : '紀錄個人的準備事項...'"
            class="flex-1 py-6 px-2 bg-transparent border-none text-base font-bold text-secondary-900 placeholder:text-secondary-200 outline-none"
            @keyup.enter="handleAddItem"
          />
          <button 
            @click="handleAddItem"
            :disabled="!newItemTitle.trim()"
            class="flex items-center gap-2 px-6 py-3 bg-secondary-900 hover:bg-black text-white text-[10px] font-black rounded-2xl transition-all disabled:opacity-20 uppercase tracking-widest active:scale-95 shadow-xl shadow-secondary-200"
          >
            <PaperAirplaneIcon class="w-4 h-4" />
            新增
          </button>
        </div>
      </div>
      <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[9px] font-black text-secondary-300 uppercase tracking-widest animate-pulse">
        <span>Press Enter to Save</span>
        <span class="w-1 h-1 rounded-full bg-secondary-200"></span>
        <span>Minimal Layout V3.0</span>
      </div>
    </div>

    <!-- List Layout (Note-Item Design) -->
    <div class="max-w-3xl mx-auto space-y-3">
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="h-24 bg-secondary-50 animate-pulse rounded-[2rem]"></div>
      </div>

      <div v-else-if="filteredItems.length === 0" class="py-32 flex flex-col items-center justify-center text-center opacity-40">
         <div class="w-24 h-24 bg-secondary-50 rounded-[3rem] flex items-center justify-center mb-8 border-2 border-dashed border-secondary-200">
           <DocumentTextIcon class="w-10 h-10 text-secondary-300" />
         </div>
         <h4 class="text-xl font-black text-secondary-900 tracking-tight">記事本目前空空如也</h4>
         <p class="text-xs font-bold text-secondary-400 mt-2 uppercase tracking-widest">Your list is clear and ready.</p>
      </div>

      <div v-else class="grid gap-3 animate-fade-in">
        <div 
          v-for="item in filteredItems" 
          :key="item.id"
          class="group/item relative bg-white p-6 rounded-[2.2rem] border border-secondary-100 hover:border-primary-200 transition-all duration-500 overflow-hidden flex items-center justify-between gap-6 hover:shadow-2xl hover:shadow-primary-100/30"
          :class="item.is_completed ? 'bg-secondary-50/30' : ''"
        >
          <!-- Left side: Check and Content -->
          <div class="flex items-center gap-6 flex-1 min-w-0">
            <!-- Checkbox with dynamic animation -->
            <button 
              @click="toggleItem(item)"
              class="w-8 h-8 flex-shrink-0 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center relative"
              :class="item.is_completed ? 'bg-emerald-500 border-emerald-500 scale-100 shadow-lg shadow-emerald-100' : 'bg-white border-secondary-100 group-hover/item:border-primary-400 scale-95 hover:scale-105'"
            >
              <CheckCircleSolid v-if="item.is_completed" class="w-5 h-5 text-white animate-pop-in" />
              <div v-else class="w-1.5 h-1.5 rounded-full bg-secondary-100 group-hover/item:bg-primary-300 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
            </button>

            <!-- Text Content -->
            <div class="flex-1 min-w-0">
              <div v-if="editingItemId === item.id" class="flex items-center pr-4">
                <input 
                  v-model="editTitle"
                  @keyup.enter="saveEdit(item)"
                  @blur="saveEdit(item)"
                  v-focus
                  class="w-full bg-secondary-50/50 border-none rounded-2xl px-5 py-2.5 text-base font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                />
              </div>
              <div v-else class="flex flex-col group/text" @click="toggleItem(item)">
                <span 
                  class="text-base font-black transition-all cursor-pointer truncate tracking-tight pr-4"
                  :class="item.is_completed ? 'text-secondary-300 line-through decoration-secondary-200/50 decoration-[2px]' : 'text-secondary-800'"
                >
                  {{ item.title }}
                </span>
                <div class="flex items-center gap-3 mt-1.5">
                   <span class="flex items-center gap-1 text-[9px] font-black text-secondary-300 uppercase tracking-widest">
                     <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                     {{ new Date(item.created_at || '').toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }) }}
                   </span>
                   <span v-if="item.category !== '其他'" class="text-[9px] font-black text-primary-400 uppercase tracking-widest bg-primary-50 px-2 py-0.5 rounded-md">
                     {{ item.category }}
                   </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right side: Avatars and Actions -->
          <div class="flex items-center gap-4 relative z-10 flex-shrink-0">
            <!-- User Status (Shared) -->
            <div v-if="activeMode === 'shared'" class="flex items-center">
               <div v-if="item.is_completed && item.completed_by" class="flex items-center gap-2 group/avatar">
                 <div class="flex flex-col items-end opacity-0 group-hover/avatar:opacity-100 transition-opacity translate-x-1 group-hover/avatar:translate-x-0">
                   <span class="text-[9px] font-black text-secondary-400 leading-none">Completed by</span>
                   <span class="text-[10px] font-black text-secondary-900 leading-none mt-0.5">{{ item.completed_by.display_name }}</span>
                 </div>
                 <img 
                   :src="item.completed_by.avatar_url || 'https://via.placeholder.com/32'"
                   class="w-8 h-8 rounded-full border-2 border-white ring-2 ring-primary-50 shadow-sm object-cover"
                 />
               </div>
               <div v-else class="w-8 h-8 rounded-full border-2 border-dashed border-secondary-100 flex items-center justify-center">
                 <UsersIcon class="w-3.5 h-3.5 text-secondary-200" />
               </div>
            </div>

            <!-- Action Menu -->
            <div class="flex items-center gap-2 transition-all translate-x-4 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100">
              <button 
                @click.stop="startEditing(item)"
                class="w-10 h-10 flex items-center justify-center bg-secondary-50 hover:bg-white text-secondary-400 hover:text-primary-600 rounded-2xl transition-all border border-transparent hover:border-secondary-100 shadow-sm hover:shadow-md"
              >
                <PencilSquareIcon class="w-4 h-4" />
              </button>
              <button 
                @click.stop="deleteItem(item.id)"
                class="w-10 h-10 flex items-center justify-center bg-secondary-50 hover:bg-white text-secondary-400 hover:text-red-600 rounded-2xl transition-all border border-transparent hover:border-secondary-100 shadow-sm hover:shadow-md"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Highlight Bar -->
          <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary-50 group-hover/item:bg-primary-500 transition-all duration-500"></div>
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
