<script setup lang="ts">
import { useItineraryStore } from '@/stores/itinerary';
import { geocodeAddress } from '@/services/geocodingService';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { ref, watch } from 'vue';

const props = defineProps<{
  isOpen: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activity: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const itineraryStore = useItineraryStore()

const name = ref('')
const location = ref('')
const duration = ref<number | ''>('')
const startTime = ref('')
const endTime = ref('')
const notes = ref('')
const loading = ref(false)
const error = ref('')

// Load activity data when opening
watch(() => props.activity, (newActivity) => {
  if (newActivity) {
    name.value = newActivity.name
    location.value = newActivity.location || ''
    duration.value = newActivity.duration || ''
    startTime.value = newActivity.start_time || ''
    endTime.value = newActivity.end_time || ''
    notes.value = newActivity.notes || ''
  }
}, { immediate: true })

async function handleSubmit() {
  if (!props.activity) return

  try {
    loading.value = true
    error.value = ''

    let lat = props.activity.latitude;
    let lng = props.activity.longitude;

    // Only geocode if location changed
    if (location.value && location.value !== props.activity.location) {
      console.log('地址已變更，重新取得座標...', location.value);
      const coords = await geocodeAddress(location.value);
      
      if (coords) {
        lat = coords.latitude;
        lng = coords.longitude;
        console.log('新座標:', coords);
      }
    }

    await itineraryStore.updateActivity(props.activity.id, {
      name: name.value,
      location: location.value,
      duration: duration.value || null,
      start_time: startTime.value || null,
      end_time: endTime.value || null,
      notes: notes.value,
      latitude: lat,
      longitude: lng
    })

    emit('success')
    emit('close')
  } catch (e: any) {
    console.error('Failed to update activity:', e);
    error.value = e.message
    alert('更新失敗，請重試');
  } finally {
    loading.value = false
  }
}

async function handleDelete() {
  if (!confirm('確定要刪除此景點嗎？')) return

  try {
    loading.value = true
    await itineraryStore.deleteActivity(props.activity.id, props.activity.itinerary_id)
    emit('success')
    emit('close')
  } catch (e: any) {
    error.value = e.message
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
              <div class="flex justify-between items-center mb-4">
                <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                  編輯景點
                </DialogTitle>
                <button 
                  v-if="activity"
                  @click="handleDelete"
                  class="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  刪除
                </button>
              </div>

              <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
                <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">名稱</label>
                  <input v-model="name" type="text" required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">地點</label>
                  <input v-model="location" type="text"
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
                  <label class="block text-sm font-medium text-gray-700">停留時間 (分鐘)</label>
                  <input v-model="duration" type="number"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">筆記</label>
                  <textarea v-model="notes" rows="3"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"></textarea>
                </div>

                <div class="mt-6 flex justify-end space-x-2">
                  <button type="button"
                    class="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    @click="emit('close')">
                    取消
                  </button>
                  <button type="submit" :disabled="loading"
                    class="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50">
                    {{ loading ? '儲存中...' : '儲存' }}
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
