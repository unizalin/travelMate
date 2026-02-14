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
        <div class="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-[2.5rem] bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
              <!-- Header -->
              <div class="px-8 pt-8 pb-4 flex justify-between items-center">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <MagnifyingGlassIcon class="w-7 h-7" />
                  </div>
                  <div>
                    <DialogTitle as="h3" class="text-2xl font-black text-secondary-900 tracking-tight">探索周邊景點</DialogTitle>
                    <p class="text-xs font-bold text-secondary-400 uppercase tracking-widest mt-0.5">Powered by Mapbox</p>
                  </div>
                </div>
                <button @click="handleClose" class="w-10 h-10 rounded-full hover:bg-secondary-50 flex items-center justify-center transition-colors">
                  <XMarkIcon class="w-6 h-6 text-secondary-400" />
                </button>
              </div>

              <!-- Search Input -->
              <div class="px-8 py-4">
                  <div class="relative group">
                    <MagnifyingGlassIcon class="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-300 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      v-model="searchQuery"
                      @keyup.enter="handleSearch"
                      placeholder="搜尋類別（如：咖啡廳、餐廳、景點）"
                      class="w-full bg-secondary-50 border-none rounded-2xl pl-14 pr-24 py-5 text-sm font-bold text-secondary-900 placeholder:text-secondary-300 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                    />
                    <button 
                        @click="handleSearch"
                        :disabled="searchLoading"
                        class="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    >
                        {{ searchLoading ? '...' : '搜尋' }}
                    </button>
                  </div>
              </div>

              <!-- Content -->
              <div class="px-8 pb-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div v-if="searchLoading" class="py-20 flex flex-col items-center justify-center gap-4">
                    <div class="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p class="text-xs font-black text-secondary-400 uppercase tracking-widest">搜尋中...</p>
                </div>
                
                <div v-else-if="results.length === 0" class="py-20 text-center">
                    <div class="w-20 h-20 rounded-[2rem] bg-secondary-50 flex items-center justify-center text-secondary-200 mx-auto mb-6">
                        <MapPinIcon class="w-10 h-10" />
                    </div>
                    <h4 class="text-lg font-black text-secondary-900 mb-2">想找哪方面的景點？</h4>
                    <p class="text-xs font-bold text-secondary-400 max-w-[200px] mx-auto uppercase tracking-wider">輸入關鍵字或直接使用預設推薦</p>
                </div>

                <div v-else class="space-y-3">
                    <div 
                        v-for="poi in results" 
                        :key="poi.id"
                        class="group p-5 bg-white border border-secondary-50 rounded-3xl hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 flex items-center justify-between"
                    >
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-secondary-50 flex items-center justify-center text-secondary-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <SparklesIcon v-if="poi.maki === 'star' || !poi.maki" class="w-6 h-6" />
                                <component v-else :is="'img'" :src="`https://raw.githubusercontent.com/mapbox/maki/master/icons/${poi.maki}-15.svg`" class="w-6 h-6 opacity-50 group-hover:opacity-100" />
                            </div>
                            <div>
                                <h4 class="text-sm font-black text-secondary-900 group-hover:text-indigo-600 transition-colors">{{ poi.name }}</h4>
                                <p class="text-[11px] font-bold text-secondary-400 mt-0.5 line-clamp-1 truncate max-w-[200px]">{{ poi.address }}</p>
                                <div class="flex gap-1 mt-1.5">
                                    <span v-for="cat in poi.category.slice(0, 2)" :key="cat" class="px-2 py-0.5 bg-secondary-50 rounded-md text-[9px] font-black text-secondary-400 uppercase tracking-tighter">
                                        {{ cat }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button 
                            @click="addPOI(poi)"
                            :disabled="loading"
                            class="p-3 bg-secondary-900 hover:bg-black text-white rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
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
  background: #f1f1f1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #e5e5e5;
}
</style>
