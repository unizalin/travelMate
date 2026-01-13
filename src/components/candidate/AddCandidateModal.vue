<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon, MapPinIcon, ChatBubbleBottomCenterTextIcon, SparklesIcon, LinkIcon } from '@heroicons/vue/24/outline'
import { candidateService } from '@/services/candidateService'
import { useToast } from '@/composables/useToast'
import AddressAutocomplete from '@/components/modals/AddressAutocomplete.vue'
import type { AddressSearchResult } from '@/services/geocodingService'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  isOpen: boolean
  tripId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'added'): void
}>()

const { showToast } = useToast()
const authStore = useAuthStore()
const loading = ref(false)

const form = ref({
  name: '',
  location: '',
  description: '',
  google_maps_url: '',
  latitude: null as number | null,
  longitude: null as number | null
})

// Google Maps URL Parsing
function parseGoogleMapsUrl(url: string) {
  if (!url) return null;
  
  // Pattern 1: q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { latitude: parseFloat(qMatch[1]), longitude: parseFloat(qMatch[2]) };
  }

  // Pattern 2: @lat,lng
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { latitude: parseFloat(atMatch[1]), longitude: parseFloat(atMatch[2]) };
  }
  
  return null;
}

watch(() => form.value.google_maps_url, (url) => {
  if (!url) return;
  
  const parsed = parseGoogleMapsUrl(url);
  if (parsed) {
    form.value.latitude = parsed.latitude;
    form.value.longitude = parsed.longitude;
  }
  
  // Try to extract name from place path
  const placeMatch = url.match(/\/maps\/place\/([^/]+)/);
  if (placeMatch && !form.value.name) {
    form.value.name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  }
})

function onAddressSelect(result: AddressSearchResult) {
  form.value.name = result.name;
  form.value.location = result.formatted_address;
  form.value.latitude = result.latitude;
  form.value.longitude = result.longitude;
}

async function handleSubmit() {
  if (!form.value.name || !form.value.location) return
  
  try {
    loading.value = true
    await candidateService.addCandidate({
      ...form.value,
      trip_id: props.tripId,
      creator_name: authStore.user?.user_metadata?.display_name || authStore.user?.email || '成員'
    } as any)
    showToast('已成功添加至願望清單！', 'success')
    emit('added')
    handleClose()
  } catch (error) {
    console.error(error)
    showToast('添加失敗，請稍後再試', 'error')
  } finally {
    loading.value = false
  }
}

function handleClose() {
  form.value = {
    name: '',
    location: '',
    description: '',
    google_maps_url: '',
    latitude: null,
    longitude: null
  }
  emit('close')
}
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
            <DialogPanel class="relative transform overflow-hidden rounded-[2.5rem] bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <!-- Header -->
              <div class="px-8 pt-8 pb-4 flex justify-between items-center">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
                    <SparklesIcon class="w-7 h-7" />
                  </div>
                  <div>
                    <DialogTitle as="h3" class="text-2xl font-black text-secondary-900 tracking-tight">新增候選景點</DialogTitle>
                    <p class="text-xs font-bold text-secondary-400 uppercase tracking-widest mt-0.5">Add to Wishlist</p>
                  </div>
                </div>
                <button @click="handleClose" class="w-10 h-10 rounded-full hover:bg-secondary-50 flex items-center justify-center transition-colors">
                  <XMarkIcon class="w-6 h-6 text-secondary-400" />
                </button>
              </div>

              <form @submit.prevent="handleSubmit" class="p-8 pt-2 space-y-6">
                <!-- Google Maps URL -->
                <div class="space-y-2">
                  <label class="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 px-1">Google 地圖連結</label>
                  <div class="relative">
                    <LinkIcon class="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-300" />
                    <input 
                      v-model="form.google_maps_url"
                      placeholder="貼上地圖連結可自動解析名稱與座標"
                      class="w-full bg-secondary-50 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-secondary-900 placeholder:text-secondary-300 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                    />
                  </div>
                </div>

                <!-- Name (Autocomplete) -->
                <div class="space-y-2">
                  <label class="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 px-1">景點名稱</label>
                  <AddressAutocomplete 
                    v-model="form.name"
                    placeholder="輸入景點名稱或地址"
                    @select="onAddressSelect"
                    class="address-autocomplete-custom"
                  />
                </div>

                <!-- Location -->
                <div class="space-y-2">
                  <label class="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 px-1">完整地址</label>
                  <div class="relative">
                    <MapPinIcon class="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-300" />
                    <input 
                      v-model="form.location"
                      required
                      placeholder="選擇名稱後自動填入"
                      class="w-full bg-secondary-50 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-secondary-900 placeholder:text-secondary-300 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                    />
                  </div>
                </div>

                <!-- Description -->
                <div class="space-y-2">
                  <label class="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 px-1">推薦備註 (選填)</label>
                  <div class="relative">
                    <ChatBubbleBottomCenterTextIcon class="absolute left-6 top-6 w-5 h-5 text-secondary-300" />
                    <textarea 
                      v-model="form.description"
                      rows="2"
                      placeholder="食物，景點..."
                      class="w-full bg-secondary-50 border-none rounded-2xl pl-14 pr-6 py-6 text-sm font-bold text-secondary-900 placeholder:text-secondary-300 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none resize-none"
                    ></textarea>
                  </div>
                </div>

                <!-- Actions -->
                <div class="pt-4">
                  <button 
                    type="submit"
                    :disabled="loading || !form.name || !form.location"
                    class="w-full bg-primary-600 hover:bg-primary-500 text-white py-5 rounded-2xl text-base font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <span v-if="loading">處理中...</span>
                    <span v-else>加入願望清單</span>
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style>
/* Override AddressAutocomplete basic styles to match our Pro Max design */
.address-autocomplete-custom input {
  @apply bg-secondary-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-secondary-900 placeholder:text-secondary-300 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none shadow-none !important;
}
.address-autocomplete-custom .absolute.z-50 {
  @apply rounded-2xl border-none shadow-2xl ring-0 mt-2 overflow-hidden !important;
}
</style>
