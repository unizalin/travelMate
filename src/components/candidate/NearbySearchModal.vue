<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon, MagnifyingGlassIcon, MapPinIcon, SparklesIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { mapboxService, type MapboxPOI } from '@/services/mapboxService'
import { candidateService } from '@/services/candidateService'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  isOpen: boolean
  tripId: string
  defaultLat?: number
  defaultLng?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'added'): void
}>()

const { showToast } = useToast()
const authStore = useAuthStore()
const loading = ref(false)
const searchLoading = ref(false)
const results = ref<MapboxPOI[]>([])
const searchQuery = ref('')

async function handleSearch() {
    if (!searchQuery.value && !props.defaultLat) return
    
    try {
        searchLoading.value = true
        // Default to tourism category if no query, or handle categories?
        // For simplicity, let's just search tourism for now or use the query
        results.value = await mapboxService.searchNearbyPOIs(
            props.defaultLat || 25.0330, 
            props.defaultLng || 121.5654,
            searchQuery.value || 'tourism'
        )
    } catch (error) {
        showToast('搜尋失敗', 'error')
    } finally {
        searchLoading.value = false
    }
}

async function addPOI(poi: MapboxPOI) {
    try {
        loading.value = true
        await candidateService.addCandidate({
            trip_id: props.tripId,
            name: poi.name,
            location: poi.address,
            latitude: poi.latitude,
            longitude: poi.longitude,
            description: `來自 Mapbox 推薦的 ${poi.category.join(', ')}`,
            creator_name: authStore.user?.user_metadata?.display_name || authStore.user?.email || '成員'
        } as any)
        showToast(`已新增 ${poi.name}！`, 'success')
        emit('added')
    } catch (error) {
        showToast('新增失敗', 'error')
    } finally {
        loading.value = false
    }
}

function handleClose() {
    results.value = []
    searchQuery.value = ''
    emit('close')
}

// Search on initial open if coordinates are provided
watch(() => props.isOpen, (open) => {
    if (open && props.defaultLat && results.value.length === 0) {
        handleSearch()
    }
})

import { watch } from 'vue'
</script>

<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-50" @close="handleClose">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-[3rem] bg-white dark:bg-secondary-950 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl border border-gray-100 dark:border-white/5">
              <!-- Header -->
              <div class="px-8 pt-8 pb-4 flex justify-between items-center transition-colors">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-colors">
                    <MagnifyingGlassIcon class="w-7 h-7" />
                  </div>
                  <div>
                    <DialogTitle as="h3" class="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight transition-colors">探索周邊景點</DialogTitle>
                    <p class="text-[9px] font-black text-gray-400 dark:text-white/30 uppercase tracking-widest mt-0.5 transition-colors">Powered by Mapbox</p>
                  </div>
                </div>
                <button @click="handleClose" class="w-10 h-10 rounded-full hover:bg-gray-50 dark:hover:bg-white/10 flex items-center justify-center transition-all">
                  <XMarkIcon class="w-6 h-6 text-gray-400 dark:text-white/20" />
                </button>
              </div>

              <!-- Search Input -->
              <div class="px-8 py-4">
                  <div class="relative group">
                    <MagnifyingGlassIcon class="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 dark:text-white/20 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      v-model="searchQuery"
                      @keyup.enter="handleSearch"
                      placeholder="搜尋類別（如：咖啡廳、餐廳、景點）"
                      class="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl pl-14 pr-24 py-5 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                    />
                    <button 
                        @click="handleSearch"
                        :disabled="searchLoading"
                        class="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 dark:hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    >
                        {{ searchLoading ? '...' : '搜尋' }}
                    </button>
                  </div>
              </div>

              <!-- Content -->
              <div class="px-8 pb-8 max-h-[60vh] overflow-y-auto custom-scrollbar transition-colors">
                <div v-if="searchLoading" class="py-20 flex flex-col items-center justify-center gap-4 transition-all">
                    <div class="w-10 h-10 border-4 border-indigo-100 dark:border-white/5 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
                    <p class="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest">搜尋中...</p>
                </div>
                
                <div v-else-if="results.length === 0" class="py-20 text-center transition-all">
                    <div class="w-20 h-20 rounded-[2rem] bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-200 dark:text-white/5 mx-auto mb-6 transition-colors">
                        <MapPinIcon class="w-10 h-10" />
                    </div>
                    <h4 class="text-lg font-black text-gray-900 dark:text-white mb-2 transition-colors">想找哪方面的景點？</h4>
                    <p class="text-[10px] font-black text-gray-400 dark:text-white/30 max-w-[200px] mx-auto uppercase tracking-widest transition-colors leading-relaxed">輸入關鍵字或直接使用預設推薦</p>
                </div>

                <div v-else class="space-y-3 transition-colors">
                    <div 
                        v-for="poi in results" 
                        :key="poi.id"
                        class="group p-5 bg-white dark:bg-white/5 border border-gray-50 dark:border-white/5 rounded-3xl hover:border-indigo-100 dark:hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex items-center justify-between"
                    >
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-white/20 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                <SparklesIcon v-if="poi.maki === 'star' || !poi.maki" class="w-6 h-6" />
                                <component v-else :is="'img'" :src="`https://raw.githubusercontent.com/mapbox/maki/master/icons/${poi.maki}-15.svg`" class="w-6 h-6 opacity-50 group-hover:opacity-100" />
                            </div>
                            <div>
                                <h4 class="text-sm font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">{{ poi.name }}</h4>
                                <p class="text-[11px] font-bold text-gray-400 dark:text-white/40 mt-0.5 line-clamp-1 truncate max-w-[200px] transition-colors leading-tight">{{ poi.address }}</p>
                                <div class="flex gap-1 mt-1.5 transition-colors">
                                    <span v-for="cat in poi.category.slice(0, 2)" :key="cat" class="px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded-md text-[9px] font-black text-gray-400 dark:text-white/40 uppercase tracking-widest group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {{ cat }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button 
                            @click="addPOI(poi)"
                            :disabled="loading"
                            class="p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 shadow-gray-500/20"
                        >
                            <PlusIcon class="w-5 h-5 stroke-[3]" />
                        </button>
                    </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
