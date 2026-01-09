<template>
  <UIDialog
    :show="isOpen"
    title="編輯景點"
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
        <label class="block text-sm font-medium text-secondary-700 mb-1.5">地點</label>
        <AddressAutocomplete
          v-model="location"
          placeholder="搜尋地點或輸入地址..."
          @select="handleAddressSelect"
        />
      </div>

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

      <div>
        <label class="block text-sm font-medium text-secondary-700 mb-1.5">筆記 (選填)</label>
        <textarea 
          v-model="notes" 
          rows="3"
          class="block w-full transition-all duration-200 sm:text-sm rounded-lg border border-secondary-200 text-secondary-900 placeholder-secondary-400 focus:ring-primary-500 focus:border-primary-500 hover:border-secondary-300 p-3 outline-none"
          placeholder="補充說明..."
        ></textarea>
      </div>

      <div class="flex flex-col sm:flex-row justify-between gap-3 pt-2">
        <UIButton variant="danger" ghost @click="handleDelete" type="button" class="sm:order-1">
          <template #icon-left>
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </template>
          刪除景點
        </UIButton>
        
        <div class="flex gap-3 sm:order-2">
          <UIButton variant="ghost" @click="emit('close')" type="button">
            取消
          </UIButton>
          <UIButton type="submit" :loading="loading">
            儲存變更
          </UIButton>
        </div>
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
import { ref, watch } from 'vue';
import { useToast } from '@/composables/useToast';
import { useDialog } from '@/composables/useDialog';

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
const { showToast } = useToast()
const { openDeleteDialog } = useDialog()

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

// Load activity data when opening
watch(() => props.activity, (newActivity) => {
  if (newActivity) {
    name.value = newActivity.name
    location.value = newActivity.location || ''
    duration.value = newActivity.duration || ''
    startTime.value = newActivity.start_time || ''
    endTime.value = newActivity.end_time || ''
    notes.value = newActivity.notes || ''
    // Retain existing coordinates unless changed
    selectedLatitude.value = newActivity.latitude || null
    selectedLongitude.value = newActivity.longitude || null
  }
}, { immediate: true })

const handleAddressSelect = (result: AddressSearchResult) => {
  location.value = result.formatted_address;
  selectedLatitude.value = result.latitude;
  selectedLongitude.value = result.longitude;
};

async function handleSubmit() {
  if (!props.activity) return

  try {
    loading.value = true
    error.value = ''

    let lat = selectedLatitude.value;
    let lng = selectedLongitude.value;

    // Only geocode if location changed and we don't have new coordinates from selection
    // Or if we still have the old coordinates but location text changed manually
    const locationChanged = location.value !== props.activity.location;
    
    if (locationChanged && location.value) {
        // If user manually typed something different but didn't select from dropdown, try to geocode
         // (However, if they selected from dropdown, lat/lng would be set by handleAddressSelect)
         // We can check if lat/lng matches what we expect or just re-geocode if uncertain.
         // A simple heuristic: if location changed, and we rely on partial matching or manual entry, we might want to Geocode.
         // But if handleAddressSelect ran, lat/lng are fresh.
         
         // If lat/lng are same as old activity but location changed, likely manual edit. Geocode it.
         if (lat === props.activity.latitude && lng === props.activity.longitude) {
            console.log('Address text changed but no selection made, geocoding...', location.value);
            const coords = await geocodeAddress(location.value);
            if (coords) {
                lat = coords.latitude;
                lng = coords.longitude;
                console.log('New coordinates:', coords);
            }
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

    showToast('更新成功', 'success')
    emit('success')
    emit('close')
  } catch (e: any) {
    console.error('Failed to update activity:', e);
    error.value = e.message
    showToast('更新失敗，請重試', 'error')
  } finally {
    loading.value = false
  }
}

async function handleDelete() {
  const confirmed = await openDeleteDialog('刪除景點', '確定要刪除此景點嗎？')
  if (!confirmed) return

  try {
    loading.value = true
    await itineraryStore.deleteActivity(props.activity.id, props.activity.itinerary_id)
    showToast('刪除成功', 'success')
    emit('success')
    emit('close')
  } catch (e: any) {
    error.value = e.message
    loading.value = false
  }
}
</script>
