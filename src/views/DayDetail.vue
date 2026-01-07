<script setup lang="ts">
import AIAssistant from '@/components/AIAssistant.vue';
import AddActivityModal from '@/components/AddActivityModal.vue';
import EditActivityModal from '@/components/EditActivityModal.vue';
import MapView from '@/components/MapView.vue';
import type { ActivitySuggestion } from '@/services/geminiService';
import { useItineraryStore } from '@/stores/itinerary';
import { useTripStore } from '@/stores/trip';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ClockIcon, 
  ListBulletIcon, 
  MapIcon, 
  MapPinIcon, 
  PencilSquareIcon, 
  PlusIcon, 
  SparklesIcon, 
  TrashIcon 
} from '@heroicons/vue/24/outline';
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
const isAISidebarOpen = ref(true);
const activeMobileTab = ref<'itinerary' | 'ai'>('itinerary');
const selectedActivity = ref<any>(null);
const highlightedActivityId = ref<string | null>(null);

// Refs for scrolling
const activityRefs = ref<Record<string, HTMLElement>>({});

// Computed
const currentTrip = computed(() => tripStore.currentTrip);
const currentItinerary = computed(() =>
  itineraryStore.itineraries.find((i: any) => i.day_number === dayNumber)
);

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
async function onDragEnd() {
  const updates = localActivities.value.map((activity, index) => ({
    id: activity.id,
    order_index: index
  }));

  if (currentItinerary.value) {
    currentItinerary.value.activities = localActivities.value;
  }

  try {
    await Promise.all(updates.map(u => itineraryStore.updateActivity(u.id, { order_index: u.order_index })));
  } catch (e) {
    console.error("Reorder failed", e);
    await itineraryStore.fetchItineraries(tripId);
  }
}

function handleEdit(activity: any) {
  selectedActivity.value = activity;
  isEditModalOpen.value = true;
}

async function handleDelete(id: string) {
  if (!confirm('確定要刪除？')) return;
  await itineraryStore.deleteActivity(id, currentItinerary.value.id);
}

async function handleAddAI(suggestion: ActivitySuggestion) {
  if (!currentItinerary.value) return;

  try {
    await itineraryStore.createActivity({
      itinerary_id: currentItinerary.value.id,
      name: suggestion.name,
      location: suggestion.location,
      duration: suggestion.duration,
      start_time: suggestion.recommendedTime, 
      notes: suggestion.description,
      order_index: localActivities.value.length
    });
    // alert(`已加入「${suggestion.name}」到行程`);
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

function toggleAISidebar() {
  isAISidebarOpen.value = !isAISidebarOpen.value;
}

// Interaction Handlers
function handleMarkerClick(activityId: string) {
  highlightedActivityId.value = activityId;
  const el = activityRefs.value[activityId];
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function handleCardClick(activity: any) {
  highlightedActivityId.value = activity.id;
  // Map interaction will be handled by passing highlightedActivityId to MapView or using map ref
}

function setActivityRef(id: string, el: any) {
  if (el) {
    activityRefs.value[id] = el;
  }
}
</script>

<template>
  <div class="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden relative">
      
      <!-- Left Area: Map + List (60%-70% on desktop) -->
      <div 
        class="flex-1 flex flex-col transition-all duration-300"
        :class="[
          activeMobileTab === 'ai' ? 'hidden lg:flex' : 'flex'
        ]"
      >
        <!-- Map Section (40% height) -->
        <div class="h-2/5 w-full relative group">
          <MapView 
            :activities="localActivities" 
            :highlighted-id="highlightedActivityId"
            @marker-click="handleMarkerClick"
          />
          
          <!-- Loading Overlay -->
          <div v-if="isLoading" class="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>

          <!-- Mobile Tab Switcher (Floating) -->
          <div class="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex bg-white rounded-full shadow-lg border border-gray-200 p-1 z-20">
            <button 
              @click="activeMobileTab = 'itinerary'"
              :class="activeMobileTab === 'itinerary' ? 'bg-primary-600 text-white' : 'text-gray-500'"
              class="px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
            >
              <ListBulletIcon class="w-3.5 h-3.5" />
              行程
            </button>
            <button 
              @click="activeMobileTab = 'ai'"
              :class="activeMobileTab === 'ai' ? 'bg-primary-600 text-white' : 'text-gray-500'"
              class="px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
            >
              <SparklesIcon class="w-3.5 h-3.5" />
              AI 助手
            </button>
          </div>
        </div>

        <!-- Itinerary List Section (60% height) -->
        <div class="flex-1 flex flex-col min-h-0 bg-slate-50">
          <!-- List Toolbar -->
          <div class="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
            <div>
              <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                第 {{ dayNumber }} 天
                <span class="text-xs font-normal text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{{ formattedDate }}</span>
              </h2>
            </div>
            <button 
              @click="isAddModalOpen = true"
              class="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md"
            >
              <PlusIcon class="w-4 h-4" />
              新增行程
            </button>
          </div>

          <!-- Draggable List -->
          <div ref="activityListRef" class="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div class="max-w-3xl mx-auto">
              <draggable 
                v-model="localActivities" 
                item-key="id" 
                handle=".drag-handle" 
                @end="onDragEnd" 
                class="space-y-4"
              >
                <template #item="{ element: activity, index }">
                  <div
                    :ref="(el) => setActivityRef(activity.id, el)"
                    @click="handleCardClick(activity)"
                    class="bg-white rounded-2xl p-5 shadow-sm border transition-all duration-300 flex gap-5 group cursor-pointer"
                    :class="[
                      highlightedActivityId === activity.id 
                        ? 'border-primary-500 ring-2 ring-primary-50 shadow-md transform scale-[1.01]' 
                        : 'border-transparent hover:border-gray-200 hover:shadow-md'
                    ]"
                  >
                    <!-- Order Index Decorator -->
                    <div class="flex-shrink-0 flex flex-col items-center">
                      <div 
                        class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                        :class="[
                          highlightedActivityId === activity.id 
                            ? 'bg-primary-600 text-white' 
                            : 'bg-primary-50 text-primary-600 group-hover:bg-primary-100'
                        ]"
                      >
                        {{ index + 1 }}
                      </div>
                      <div v-if="index < localActivities.length - 1" class="w-0.5 flex-1 bg-gray-100 my-2"></div>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-start">
                        <div>
                          <h4 class="font-bold text-gray-900 text-lg leading-tight">{{ activity.name }}</h4>
                          <div class="flex items-center text-sm text-gray-500 mt-1.5 gap-4">
                            <span v-if="activity.start_time" class="flex items-center gap-1 font-medium text-gray-700">
                              <ClockIcon class="w-4 h-4 text-gray-400" />
                              {{ activity.start_time?.substring(0, 5) }}
                              <span v-if="activity.end_time">- {{ activity.end_time?.substring(0, 5) }}</span>
                            </span>
                            <span v-if="activity.duration" class="flex items-center gap-1">
                              <span class="text-gray-300">|</span>
                              {{ activity.duration }} 分鐘
                            </span>
                          </div>
                        </div>
                        
                        <!-- Actions -->
                        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button @click.stop="handleEdit(activity)" class="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                            <PencilSquareIcon class="w-5 h-5" />
                          </button>
                          <button @click.stop="handleDelete(activity.id)" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <TrashIcon class="w-5 h-5" />
                          </button>
                          <div class="drag-handle cursor-move p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div v-if="activity.location" class="flex items-center text-sm text-gray-500 mt-2 gap-1.5">
                        <MapPinIcon class="w-4 h-4 text-gray-400" />
                        <span class="truncate">{{ activity.location }}</span>
                      </div>
                      
                      <p v-if="activity.notes" class="mt-3 text-sm text-gray-600 line-clamp-2 leading-relaxed italic border-l-2 border-gray-100 pl-3">
                        {{ activity.notes }}
                      </p>
                    </div>
                  </div>
                </template>
              </draggable>

              <div v-if="localActivities.length === 0" class="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100 mt-4">
                <div class="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapIcon class="w-8 h-8 text-gray-300" />
                </div>
                <h3 class="text-gray-900 font-bold">尚未規劃行程</h3>
                <p class="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                  快點擊右上角新增，或使用右側 AI 助手為您推薦景點吧！
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Area: AI Assistant (Collapsible Sidebar) -->
      <aside 
        class="bg-white border-l border-gray-200 shadow-2xl z-30 flex flex-col transition-all duration-300 ease-in-out relative overflow-visible"
        :class="[
          isAISidebarOpen ? 'w-full lg:w-[400px] xl:w-[450px]' : 'w-0',
          activeMobileTab === 'itinerary' ? 'hidden lg:flex' : 'flex'
        ]"
      >
        <!-- Toggle Button (Desktop only, positioned on the left edge) -->
        <button 
          @click="toggleAISidebar"
          class="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-12 bg-white border border-gray-200 shadow-md rounded-l-xl items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-all z-40"
        >
          <ChevronRightIcon v-if="!isAISidebarOpen" class="w-5 h-5" />
          <ChevronLeftIcon v-else class="w-5 h-5" />
        </button>

        <div v-if="isAISidebarOpen" class="h-full flex flex-col overflow-hidden">
          <AIAssistant 
            v-if="currentTrip" 
            :destination="currentTrip.destination" 
            :day-number="dayNumber"
            @add-activity="handleAddAI" 
          />
        </div>
      </aside>
    </div>

    <!-- Modals -->
    <AddActivityModal v-if="currentItinerary" :is-open="isAddModalOpen" :itinerary-id="currentItinerary.id"
      :current-order="localActivities.length" @close="isAddModalOpen = false" @success="handleSuccess" />

    <EditActivityModal :is-open="isEditModalOpen" :activity="selectedActivity" @close="isEditModalOpen = false"
      @success="handleSuccess" />

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
