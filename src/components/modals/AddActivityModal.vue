<script setup lang="ts">
import { useItineraryStore } from '@/stores/itinerary';
import { geocodeAddress, type AddressSearchResult } from '@/services/geocodingService';
import AddressAutocomplete from '@/components/modals/AddressAutocomplete.vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { ref } from 'vue';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  isOpen: boolean
  itineraryId: string
  currentOrder: number
  tripId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const itineraryStore = useItineraryStore()
const { showToast } = useToast()

const name = ref('')
const location = ref('')
const duration = ref<number | ''>('')
const startTime = ref('')
const endTime = ref('')
const notes = ref('')
const loading = ref(false)
const error = ref('')
const selectedLatitude = ref<number | null>(null)
const selectedLongitude = ref<number | null>(null)

const handleAddressSelect = (result: AddressSearchResult) => {
  location.value = result.formatted_address;
  selectedLatitude.value = result.latitude;
  selectedLongitude.value = result.longitude;
  
  // Auto-fill name if empty
  if (!name.value && result.name) {
    name.value = result.name;
  }
};

async function handleSubmit() {
  try {
    loading.value = true
    error.value = ''

    let lat = selectedLatitude.value;
    let lng = selectedLongitude.value;

    // If coordinates are missing but we have a location string, try to geocode one last time
    if ((!lat || !lng) && location.value) {
      const coords = await geocodeAddress(location.value);
      if (coords) {
        lat = coords.latitude;
        lng = coords.longitude;
      }
    }

    await itineraryStore.createActivity({
      itinerary_id: props.itineraryId,
      name: name.value,
      location: location.value,
      duration: duration.value || null,
      start_time: startTime.value || null,
      end_time: endTime.value || null,
      notes: notes.value,
      order_index: props.currentOrder + 1,
      // @ts-ignore
      latitude: lat,
      // @ts-ignore
      longitude: lng
    })

    // Reset form
    name.value = ''
    location.value = ''
    duration.value = ''
    startTime.value = ''
    endTime.value = ''
    notes.value = ''
    selectedLatitude.value = null
    selectedLongitude.value = null

    showToast('新增成功', 'success')
    emit('success')
    emit('close')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="emit('close')" class="relative z-10">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                新增景點
              </DialogTitle>

              <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
                <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">名稱</label>
                  <input v-model="name" type="text" required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">地點 (選填)</label>
                  <AddressAutocomplete
                    v-model="location"
                    placeholder="搜尋地點或輸入地址..."
                    @select="handleAddressSelect"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">停留時間 (分鐘)</label>
                  <input v-model="duration" type="number"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">開始時間</label>
                    <input v-model="startTime" type="time"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">結束時間</label>
                    <input v-model="endTime" type="time"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">備註 (選填)</label>
                  <textarea v-model="notes" rows="3"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"></textarea>
                </div>

                <div class="mt-4 flex justify-end space-x-2">
                  <button type="button"
                    class="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    @click="emit('close')">
                    取消
                  </button>
                  <button type="submit" :disabled="loading"
                    class="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50">
                    {{ loading ? '新增中...' : '新增' }}
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
