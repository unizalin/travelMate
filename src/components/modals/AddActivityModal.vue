<template>
  <UIDialog
    :show="isOpen"
    title="新增景點"
    @close="emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-5">
      <div v-if="error" class="p-3 rounded-lg bg-red-50 border border-red-100 text-danger text-xs font-medium">
        {{ error }}
      </div>

      <UIInput
        v-model="name"
        label="景點名稱"
        placeholder="例如：東京鐵塔"
        required
      />

      <div>
        <label class="block text-sm font-medium text-secondary-700 mb-1.5">地點 (選填)</label>
        <AddressAutocomplete
          v-model="location"
          placeholder="搜尋地點或輸入地址..."
          @select="handleAddressSelect"
        />
      </div>

      <UIInput
        v-model="duration"
        label="停留時間 (分鐘)"
        type="number"
        placeholder="60"
      >
        <template #prepend>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </template>
      </UIInput>

      <div class="grid grid-cols-2 gap-4">
        <UIInput
          v-model="startTime"
          label="開始時間"
          type="time"
        />
        <UIInput
          v-model="endTime"
          label="結束時間"
          type="time"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-secondary-700 mb-1.5">備註 (選填)</label>
        <textarea 
          v-model="notes" 
          rows="3"
          class="block w-full transition-all duration-200 sm:text-sm rounded-lg border border-secondary-200 text-secondary-900 placeholder-secondary-400 focus:ring-primary-500 focus:border-primary-500 hover:border-secondary-300 p-3 outline-none"
          placeholder="補充說明..."
        ></textarea>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <UIButton variant="ghost" @click="emit('close')" type="button">
          取消
        </UIButton>
        <UIButton type="submit" :loading="loading">
          確認新增
        </UIButton>
      </div>
    </form>
  </UIDialog>
</template>

<script setup lang="ts">
import { useItineraryStore } from '@/stores/itinerary';
import { geocodeAddress, type AddressSearchResult } from '@/services/geocodingService';
import AddressAutocomplete from '@/components/modals/AddressAutocomplete.vue';
import UIDialog from '@/components/ui/Dialog.vue';
import UIInput from '@/components/ui/Input.vue';
import UIButton from '@/components/ui/Button.vue';
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
