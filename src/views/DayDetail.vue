<script setup lang="ts">
import AIAssistant from '@/components/AIAssistant.vue';
import AddActivityModal from '@/components/AddActivityModal.vue';
import EditActivityModal from '@/components/EditActivityModal.vue';
import MapView from '@/components/MapView.vue';
import type { ActivitySuggestion } from '@/services/geminiService';
import { useItineraryStore } from '@/stores/itinerary';
import { useTripStore } from '@/stores/trip';
import { ClockIcon, MapPinIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import draggable from 'vuedraggable';

const route = useRoute();
const tripId = route.params.tripId as string;
const dayNumber = parseInt(route.params.dayNumber as string) || 1;

const itineraryStore = useItineraryStore();
const tripStore = useTripStore();

// State
const isLoading = ref(true);
const isAddModalOpen = ref(false);
const isEditModalOpen = ref(false);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectedActivity = ref<any>(null);
// const activeTab = ref<'map' | 'list'>('list'); // For mobile - TODO: implement tab switching

// Computed
const currentTrip = computed(() => tripStore.currentTrip);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const currentItinerary = computed(() =>
  itineraryStore.itineraries.find((i: any) => i.day_number === dayNumber)
);
// Removed: using localActivities instead which is writable
// const activities = computed({
//   get: () => currentItinerary.value?.activities || [],
//   set: (val) => { }
// });

// Since v-model requires a writable array, let's create a local writable ref that syncs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localActivities = ref<any[]>([]);

watch(() => currentItinerary.value?.activities, (newVal) => {
  if (newVal) {
    localActivities.value = [...newVal];
  }
}, { immediate: true, deep: true });


const formattedDate = computed(() => {
  if (!currentItinerary.value) return '';
  const date = new Date(currentItinerary.value.date);
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date);
});

// Initial Fetch
onMounted(async () => {
  if (!currentTrip.value) {
    // If loaded directly, fetch trip first
    await tripStore.fetchTrips();
    const trip = tripStore.trips.find((t: any) => t.id === tripId);
    if (trip) {
      tripStore.currentTrip = trip;
      await itineraryStore.fetchItineraries(tripId, trip.start_date, trip.end_date);
    }
  } else {
    await itineraryStore.fetchItineraries(tripId, currentTrip.value.start_date, currentTrip.value.end_date);
  }
  isLoading.value = false;
});

// Actions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function onDragEnd(_evt: any) {
  // Update order_index for all items
  const updates = localActivities.value.map((activity, index) => ({
    id: activity.id,
    order_index: index
  }));

  // Optimistic update
  if (currentItinerary.value) {
    currentItinerary.value.activities = localActivities.value;
  }

  try {
    // We would likely need a batch update API in service, 
    // but for now, iterating updates (not ideal for perf but works for MVP) or implement reorder API.
    // Ideally: await itineraryStore.reorderActivities(updates);
    // Fallback: update individually (concurrently) components

    // NOTE: User didn't strictly ask for batch reorder API, but drag/drop implies it.
    // To keep it simple, I will just call updateActivity for changed items?
    // Or unimplemented for now? No, user explicitly asked for "Drag Sort".
    // Let's assume we update one by one for now or add a TODO.

    // Actually, let's loop update.
    await Promise.all(updates.map(u => itineraryStore.updateActivity(u.id, { order_index: u.order_index })));
  } catch (e) {
    console.error("Reorder failed", e);
    // Revert?
    await itineraryStore.fetchItineraries(tripId);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Removed: using inline time formatting in template
// function formatTime(startTime: string, endTime: string) {
//   if (!startTime) return '未定';
//   let str = startTime.substring(0, 5);
//   if (endTime) str += ` - ${endTime.substring(0, 5)}`;
//   return str;
// }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleEdit(activity: any) {
  selectedActivity.value = activity;
  isEditModalOpen.value = true;
}

async function handleDelete(id: string) {
  if (!confirm('確定要刪除？')) return;
  await itineraryStore.deleteActivity(id, currentItinerary.value.id);
}

// Add from AI or Manual
async function handleAddAI(suggestion: ActivitySuggestion) {
  if (!currentItinerary.value) return;

  try {
    await itineraryStore.createActivity({
      itinerary_id: currentItinerary.value.id,
      name: suggestion.name,
      location: suggestion.location,
      duration: suggestion.duration,
      start_time: suggestion.recommendedTime, // AI gives HH:MM
      notes: suggestion.description,
      order_index: localActivities.value.length
    });

    // Success Toast? 
    alert(`已加入「${suggestion.name}」到行程`);
  } catch (e) {
    console.error(e);
    alert('加入失敗');
  }
}

function handleSuccess() {
  itineraryStore.fetchItineraries(tripId);
  isAddModalOpen.value = false;
  isEditModalOpen.value = false;
}

</script>

<template>
  <div class="h-[calc(100vh-64px)] overflow-hidden flex flex-col md:flex-row bg-gray-50">

    <!-- Left Column: Map & List -->
    <div class="w-full md:w-[60%] flex flex-col h-full relative">

      <!-- Loading State -->
      <div v-if="isLoading" class="absolute inset-0 bg-white z-50 flex items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>

      <!-- Header -->
      <div class="bg-white p-4 shadow-sm z-10 flex justify-between items-center px-6">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2">
            第 {{ dayNumber }} 天
            <span class="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{{ formattedDate
            }}</span>
          </h2>
          <p v-if="currentTrip" class="text-xs text-gray-400 mt-1">📍 {{ currentTrip.destination }}</p>
        </div>
        <button @click="isAddModalOpen = true" class="md:hidden bg-primary-600 text-white p-2 rounded-full shadow-lg">
          <PlusIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-hidden flex flex-col">

        <!-- Map Section (40%) -->
        <div class="h-[35%] md:h-[40%] w-full relative z-0">
          <MapView :activities="localActivities" />
        </div>

        <!-- Activities List (60%) -->
        <div class="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div class="max-w-3xl mx-auto space-y-3 pb-20 md:pb-4">

            <div class="flex justify-between items-end mb-2">
              <h3 class="font-bold text-gray-700">行程列表</h3>
              <button @click="isAddModalOpen = true"
                class="hidden md:flex text-sm text-primary-600 hover:text-primary-700 font-medium items-center gap-1">
                + 新增景點
              </button>
            </div>

            <draggable v-model="localActivities" item-key="id" handle=".drag-handle" @end="onDragEnd" class="space-y-3">
              <template #item="{ element: activity }">
                <div
                  class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow group">
                  <!-- Time Col -->
                  <div
                    class="w-16 flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 pr-4">
                    <span class="text-sm font-bold text-gray-800">{{ activity.start_time?.substring(0, 5) || '--:--'
                    }}</span>
                    <span class="text-xs text-gray-400">{{ activity.end_time?.substring(0, 5) || '' }}</span>
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start">
                      <h4 class="font-bold text-gray-800 text-lg truncate">{{ activity.name }}</h4>
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button @click="handleEdit(activity)" class="p-1 text-gray-400 hover:text-primary-600 rounded">
                          <PencilSquareIcon class="w-4 h-4" />
                        </button>
                        <button @click="handleDelete(activity.id)" class="p-1 text-gray-400 hover:text-red-500 rounded">
                          <TrashIcon class="w-4 h-4" />
                        </button>
                        <div class="drag-handle cursor-move p-1 text-gray-300 hover:text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center text-sm text-gray-500 mt-1 gap-4">
                      <span v-if="activity.location" class="flex items-center gap-1 truncate max-w-[200px]">
                        <MapPinIcon class="w-3 h-3" />
                        {{ activity.location }}
                      </span>
                      <span v-if="activity.duration" class="flex items-center gap-1">
                        <ClockIcon class="w-3 h-3" />
                        {{ activity.duration }}m
                      </span>
                    </div>
                  </div>
                </div>
              </template>
            </draggable>

            <div v-if="localActivities.length === 0"
              class="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              尚無行程，請點擊新增或使用右側 AI 助手
            </div>

          </div>
        </div>

      </div>
    </div>

    <!-- Right Column: AI Assistant (40%) -->
    <div class="hidden md:block w-[40%] h-full border-l border-gray-200 bg-white shadow-xl z-20">
      <AIAssistant v-if="currentTrip" :destination="currentTrip.destination" :day-number="dayNumber"
        @add-activity="handleAddAI" />
    </div>

    <!-- Mobile AI Assistant Toggle/Drawer could go here -->

    <!-- Modals -->
    <AddActivityModal v-if="currentItinerary" :is-open="isAddModalOpen" :itinerary-id="currentItinerary.id"
      :current-order="localActivities.length" @close="isAddModalOpen = false" @success="handleSuccess" />

    <EditActivityModal :is-open="isEditModalOpen" :activity="selectedActivity" @close="isEditModalOpen = false"
      @success="handleSuccess" />

  </div>
</template>
