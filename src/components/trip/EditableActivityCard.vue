<template>
  <UICard
    shadow="md"
    body-class="p-0"
    class="border-2 border-primary-100 ring-2 ring-primary-50 ring-offset-2 overflow-hidden animate-in fade-in zoom-in duration-200"
  >
    <div class="flex flex-col sm:flex-row">
      <!-- Drag Handle & Index -->
      <div class="bg-primary-50 flex sm:flex-col items-center justify-between sm:justify-start p-3 sm:w-12 gap-3 border-b sm:border-b-0 sm:border-r border-primary-100">
        <div class="drag-handle cursor-move p-1.5 text-primary-400 hover:text-primary-600 hover:bg-white rounded-lg transition-all">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
        <div class="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
          {{ index + 1 }}
        </div>
        <button 
          @click="$emit('delete', activity.id)"
          class="sm:mt-auto p-1.5 text-secondary-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
          title="刪除"
        >
          <TrashIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Edit Form -->
      <div class="flex-1 p-5 space-y-5 bg-white">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Main Info -->
          <div class="space-y-4">
            <UIInput
              v-model="localActivity.name"
              label="景點名稱"
              placeholder="請輸入景點名稱"
              class="font-bold"
              @change="handleUpdate"
            />
            
            <div class="relative">
              <label class="block text-sm font-medium text-secondary-700 mb-1.5">地點</label>
              <div class="flex gap-2">
                <AddressAutocomplete
                  v-model="localActivity.location"
                  placeholder="搜尋地點或輸入地址..."
                  class="flex-1"
                  @select="handleAddressSelect"
                />
              </div>
            </div>
          </div>

          <!-- Time & Duration -->
          <div class="space-y-4 pt-0 md:pt-0">
            <div class="grid grid-cols-2 gap-3">
              <UIInput
                v-model="localActivity.start_time"
                label="開始時間"
                type="time"
                @change="handleTimeChange"
              />
              <UIInput
                v-model="localActivity.end_time"
                label="結束時間"
                type="time"
                @change="handleTimeChange"
              />
            </div>

            <div class="flex items-end gap-3">
              <UIInput
                v-model.number="localActivity.duration"
                label="停留時間 (分鐘)"
                type="number"
                placeholder="60"
                @change="handleDurationChange"
              >
                <template #prepend>
                  <ClockIcon class="w-4 h-4" />
                </template>
              </UIInput>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="pt-2 border-t border-secondary-50">
          <label class="block text-sm font-medium text-secondary-700 mb-1.5">行程筆記 (選填)</label>
          <textarea 
            v-model="localActivity.notes" 
            rows="2"
            class="block w-full transition-all duration-200 sm:text-sm rounded-lg border border-secondary-200 text-secondary-900 placeholder-secondary-400 focus:ring-primary-500 focus:border-primary-500 hover:border-secondary-300 p-3 outline-none bg-secondary-50/30"
            placeholder="記錄一些特別的事項..."
            @change="handleUpdate"
          ></textarea>
        </div>
      </div>
    </div>
  </UICard>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { TrashIcon, ClockIcon } from '@heroicons/vue/24/outline';
import UICard from '@/components/ui/Card.vue';
import UIInput from '@/components/ui/Input.vue';
import AddressAutocomplete from '@/components/modals/AddressAutocomplete.vue';
import type { AddressSearchResult } from '@/services/geocodingService';

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activity: any
  index: number
}>();

const emit = defineEmits<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (e: 'update', data: any): void
  (e: 'delete', id: string): void
}>();

const localActivity = ref({ ...props.activity });

watch(() => props.activity, (newVal) => {
  localActivity.value = { ...newVal };
}, { deep: true });

function handleUpdate() {
  emit('update', { ...localActivity.value });
}

function handleAddressSelect(result: AddressSearchResult) {
  localActivity.value.location = result.formatted_address;
  localActivity.value.latitude = result.latitude;
  localActivity.value.longitude = result.longitude;
  handleUpdate();
}

function handleTimeChange() {
  const { start_time, end_time } = localActivity.value;
  if (start_time && end_time) {
    const start = parseTime(start_time);
    const end = parseTime(end_time);
    if (end > start) {
      localActivity.value.duration = Math.round((end.getTime() - start.getTime()) / 60000);
    }
  }
  handleUpdate();
}

function handleDurationChange() {
  const { start_time, duration } = localActivity.value;
  if (start_time && duration) {
    const start = parseTime(start_time);
    const end = new Date(start.getTime() + duration * 60000);
    localActivity.value.end_time = formatTime(end);
  }
  handleUpdate();
}

function parseTime(timeStr: string) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatTime(date: Date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}
</script>
