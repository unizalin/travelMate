<template>
  <div class="bg-white h-full border-l flex flex-col w-80 shadow-xl z-20">
    <div class="p-4 border-b bg-gray-50 flex justify-between items-center text-sm">
      <h2 class="font-bold text-gray-900">行程天數</h2>
      <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
        <span class="sr-only">Close</span>
        ✕
      </button>
    </div>
    
    <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
      <draggable 
        v-model="localItineraries" 
        item-key="id" 
        handle=".drag-handle"
        ghost-class="ghost-item"
        drag-class="drag-item"
        class="space-y-3"
        @start="isDragging = true"
        @end="onDragEnd"
      >
        <template #item="{ element: itinerary, index }">
          <div 
            @click="$emit('select-day', index + 1)"
            class="group p-4 bg-white rounded-xl border-2 transition-all cursor-move relative flex items-center gap-4"
            :class="[
              activeDay === index + 1 
                ? 'border-primary-500 bg-primary-50/20' 
                : 'border-secondary-100 hover:border-primary-200 hover:bg-secondary-50/30'
            ]"
          >
            <!-- Drag Handle Icon -->
            <div class="drag-handle flex-shrink-0 text-secondary-300 hover:text-primary-400 transition-colors">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 3h2v18H9V3zm4 0h2v18h-2V3z" />
              </svg>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-secondary-900">D{{ index + 1 }} 第 {{ index + 1 }} 天</span>
                <span v-if="activeDay === index + 1" class="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
              </div>
              <div class="text-xs text-secondary-500 font-medium">{{ formatDate(itinerary.date) }}</div>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                  {{ itinerary.activities?.length || 0 }} 景點
                </span>
                
                <!-- Mini Preview Dots -->
                <div class="flex -space-x-1 overflow-hidden" v-if="itinerary.activities?.length > 0">
                  <div 
                    v-for="i in Math.min(itinerary.activities.length, 3)" 
                    :key="i"
                    class="w-1.5 h-1.5 rounded-full border border-white"
                    :class="activeDay === index + 1 ? 'bg-primary-300' : 'bg-secondary-200'"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itineraries: any[]
  activeDay?: number;
}>()

const emit = defineEmits<{
  (e: 'select-day', day: number): void
  (e: 'reorder', itineraries: any[]): void
  (e: 'close'): void
}>()

const localItineraries = ref([...props.itineraries]);
const isDragging = ref(false);

watch(() => props.itineraries, (newVal) => {
  if (!isDragging.value) {
    localItineraries.value = [...newVal];
  }
}, { deep: true });

const onDragEnd = () => {
  isDragging.value = false;
  emit('reorder', localItineraries.value);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日 ${weekday}`;
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #f1f5f9;
  border-radius: 10px;
}

/* Dragging visual effects */
.ghost-item {
  opacity: 0.4;
  background: #eff6ff !important;
  border-color: #3b82f6 !important;
}

.drag-item {
  opacity: 1 !important;
  transform: scale(1.05);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important;
  border-color: #3b82f6 !important;
  background: white !important;
  z-index: 50;
}
</style>
