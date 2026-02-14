<script setup lang="ts">
import AIAssistant from '@/components/trip/AIAssistant.vue';
import AddActivityModal from '@/components/modals/AddActivityModal.vue';
import EditActivityModal from '@/components/modals/EditActivityModal.vue';
import EditableActivityCard from '@/components/trip/EditableActivityCard.vue';
import MapView from '@/components/map/MapView.vue';
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
import { useToast } from '@/composables/useToast';
import { useDialog } from '@/composables/useDialog';
import { mapboxService } from '@/services/mapboxService';

const route = useRoute();
const tripId = route.params.tripId as string;
const dayNumber = parseInt(route.params.dayNumber as string) || 1;

const itineraryStore = useItineraryStore();
const tripStore = useTripStore();
const { showToast } = useToast();
const { openDeleteDialog } = useDialog();

// State
const isLoading = ref(true);
const isAddModalOpen = ref(false);
const isEditModalOpen = ref(false);
const isAISidebarOpen = ref(true);
const activeMobileTab = ref<'itinerary' | 'ai'>('itinerary');
const selectedActivity = ref<any>(null);
const isEditMode = ref(false);
const highlightedActivityId = ref<string | null>(null);
const isOptimizing = ref(false);
const showRoute = ref(true);

// Refs
const mapRef = ref<any>(null);
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
    // Check if itineraries loaded
    if (itineraryStore.itineraries.length === 0) {
       await itineraryStore.fetchItineraries(tripId, currentTrip.value.start_date, currentTrip.value.end_date);
    }
  }
  isLoading.value = false;
});

// Actions
async function onDragEnd() {
  const previousActivities = [...localActivities.value]; // Save for possible reversion
  
  const updates = localActivities.value.map((activity, index) => ({
    id: activity.id,
    order_index: index
  }));

  // Optimistically update store
  if (currentItinerary.value) {
    currentItinerary.value.activities = [...localActivities.value];
  }

  try {
    await Promise.all(updates.map(u => itineraryStore.updateActivity(u.id, { order_index: u.order_index })));
    showToast('排序已更新', 'success');
  } catch (e) {
    console.error("Reorder failed", e);
    showToast('排序更新失敗', 'error');
    
    // Revert on failure
    localActivities.value = previousActivities;
    if (currentItinerary.value) {
      currentItinerary.value.activities = previousActivities;
    }
    
    // Refresh from server to be sure
    await itineraryStore.fetchItineraries(tripId, currentTrip.value?.start_date, currentTrip.value?.end_date);
  }
}

function handleEdit(activity: any) {
  selectedActivity.value = activity;
  isEditModalOpen.value = true;
}

async function handleDelete(id: string) {
  if (isEditMode.value) {
     try {
      await itineraryStore.deleteActivity(id, currentItinerary.value!.id);
      showToast('刪除成功', 'success');
    } catch (e) {
      showToast('刪除失敗', 'error');
    }
    return;
  }
  const confirmed = await openDeleteDialog('刪除行程', '確定要刪除此行程嗎？');
  if (!confirmed) return;
  
  if (currentItinerary.value) {
    try {
      await itineraryStore.deleteActivity(id, currentItinerary.value.id);
      showToast('刪除成功', 'success');
    } catch (e) {
      showToast('刪除失敗', 'error');
    }
  }
}

async function handleUpdate(activity: any) {
  try {
    await itineraryStore.updateActivity(activity.id, {
      name: activity.name,
      location: activity.location,
      duration: activity.duration,
      start_time: activity.start_time,
      end_time: activity.end_time,
      notes: activity.notes,
      latitude: activity.latitude,
      longitude: activity.longitude
    });
  } catch (e) {
    showToast('更新失敗', 'error');
  }
}

async function handleOptimizeRoute() {
  if (localActivities.value.length < 2) {
    showToast('景點數量不足，無法優化', 'info');
    return;
  }

  // Check if all activities have coordinates
  const activitiesWithCoords = localActivities.value.filter(a => (a.latitude && a.longitude) || (a.start_location_lat && a.start_location_lng));
  
  if (activitiesWithCoords.length < localActivities.value.length) {
    showToast('部分景點缺少座標，請先設定地點', 'warning');
    // We could try to geocode here, but better to warn
    return;
  }

  try {
    isOptimizing.value = true;
    const coords: [number, number][] = localActivities.value.map(a => [
      a.longitude || a.start_location_lng,
      a.latitude || a.start_location_lat
    ]);

    const optimizedOrder = await mapboxService.getOptimizedOrder(coords);
    const optimizedActivities = optimizedOrder.map(index => localActivities.value[index]);
    
    // Update local and store
    await itineraryStore.updateActivitiesBatch(currentItinerary.value!.id, optimizedActivities);
    showToast('順序已優化！', 'success');
  } catch (error) {
    console.error(error);
    showToast('排程優化失敗', 'error');
  } finally {
    isOptimizing.value = false;
  }
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
    showToast('已加入行程', 'success');
  } catch (e) {
    console.error(e);
    showToast('加入失敗', 'error');
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
  
  // Focus map on activity
  if (mapRef.value) {
    mapRef.value.focusOnActivity(activity.id);
  }
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
      
      <!-- Left Area: Map + List -->
      <div 
        class="flex-1 flex flex-col transition-all duration-300"
        :class="[
          activeMobileTab === 'ai' ? 'hidden lg:flex' : 'flex'
        ]"
      >
        <!-- Map Section (40% height) -->
        <div class="h-2/5 w-full relative group">
          <MapView 
            ref="mapRef"
            :activities="localActivities" 
            :highlighted-id="highlightedActivityId"
            :show-route="showRoute"
            @marker-click="handleMarkerClick"
          />
          
          <!-- Loading Overlay -->
          <div v-if="isLoading" class="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          <!-- Map Controls -->
          <div class="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 text-xs z-10 border border-gray-100 hidden md:block">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                1
              </div>
              <span class="text-gray-600 font-medium">景點順序</span>
            </div>
          </div>
          
          <button 
            v-if="localActivities.length > 1"
            @click="mapRef?.fitBounds()"
            class="absolute bottom-4 right-4 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg shadow-lg text-xs font-medium transition-colors z-10 flex items-center gap-1.5 border border-gray-200"
          >
            <MapIcon class="w-4 h-4 text-gray-500" />
            顯示全部
          </button>

          <button 
            v-if="localActivities.length > 1"
            @click="showRoute = !showRoute"
            class="absolute bottom-16 right-4 bg-white hover:bg-gray-50 px-3 py-2 rounded-lg shadow-lg text-xs font-medium transition-colors z-10 flex items-center gap-1.5 border border-gray-200"
            :class="showRoute ? 'text-blue-600 border-blue-100' : 'text-gray-700'"
          >
            <MapPinIcon class="w-4 h-4" />
            {{ showRoute ? '隱藏路線' : '顯示路線' }}
          </button>

          <!-- Mobile Tab Switcher (Floating) -->
          <div class="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex bg-white rounded-full shadow-lg border border-gray-200 p-1 z-20">
            <button 
              @click="activeMobileTab = 'itinerary'"
              :class="[
                'px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1',
                activeMobileTab === 'itinerary' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              ]"
            >
              <ListBulletIcon class="w-3.5 h-3.5" />
              行程
            </button>
            <button 
              @click="activeMobileTab = 'ai'"
              :class="[
                'px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1',
                activeMobileTab === 'ai' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              ]"
            >
              <SparklesIcon class="w-3.5 h-3.5" />
              AI 助手
            </button>
          </div>
        </div>

        <!-- Itinerary List Section (60% height) -->
        <div class="flex-1 flex flex-col min-h-0 bg-slate-50">
          <!-- List Toolbar -->
          <div class="px-6 py-3 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
            <div class="flex items-center gap-3">
              <button 
                @click="$router.back()" 
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                title="返回"
              >
                <ChevronLeftIcon class="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
              </button>
              
              <div>
                <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                  第 {{ dayNumber }} 天
                </h1>
                <p class="text-xs text-gray-500">{{ formattedDate }}</p>
              </div>
              
              <span class="hidden sm:inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                {{ localActivities.length }} 個景點
              </span>
            </div>
            
            <div class="flex items-center gap-2">
              <button 
                @click="isEditMode = !isEditMode"
                :class="[
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                  isEditMode 
                    ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-inner' 
                    : 'bg-white text-secondary-600 border-secondary-200 hover:bg-secondary-50'
                ]"
              >
                <PencilSquareIcon class="w-4 h-4" />
                {{ isEditMode ? '停止編輯' : '快速編輯' }}
              </button>

              <button 
                @click="handleOptimizeRoute"
                :disabled="isOptimizing || localActivities.length < 2"
                class="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50"
              >
                <SparklesIcon class="w-4 h-4" :class="{'animate-pulse': isOptimizing}" />
                {{ isOptimizing ? '優化中...' : '路徑優化' }}
              </button>

              <button 
                @click="isAddModalOpen = true"
                class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <PlusIcon class="w-4 h-4" />
                新增景點
              </button>
            </div>
          </div>

          <!-- Draggable List -->
          <div ref="activityListRef" class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
            <div class="max-w-3xl mx-auto">
              <draggable 
                v-model="localActivities" 
                item-key="id" 
                handle=".drag-handle" 
                ghost-class="opacity-50"
                drag-class="scale-105"
                @end="onDragEnd" 
                class="space-y-4"
              >
                <template #item="{ element: activity, index }">
                  <div class="relative group">
                    <EditableActivityCard 
                      v-if="isEditMode"
                      :activity="activity"
                      :index="index"
                      @update="handleUpdate"
                      @delete="handleDelete"
                    />
                    
                    <div
                      v-else
                      :ref="(el) => setActivityRef(activity.id, el)"
                      @click="handleCardClick(activity)"
                      class="bg-white rounded-xl p-4 border-2 transition-all duration-200 flex gap-4 group cursor-pointer relative overflow-hidden"
                      :class="[
                        highlightedActivityId === activity.id 
                          ? 'border-blue-500 shadow-lg shadow-blue-100 scale-[1.01] z-10' 
                          : 'border-transparent hover:border-gray-200 hover:shadow-md'
                      ]"
                    >
                      <!-- Highlight Indicator -->
                      <div 
                        v-if="highlightedActivityId === activity.id"
                        class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"
                      ></div>
                      
                      <!-- Index Badge -->
                      <div class="flex-shrink-0 flex flex-col items-center pt-1">
                        <div 
                          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all duration-300"
                          :class="[
                            highlightedActivityId === activity.id 
                              ? 'bg-blue-600 text-white scale-110' 
                              : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                          ]"
                        >
                          {{ index + 1 }}
                        </div>
                        <div 
                          v-if="index < localActivities.length - 1" 
                          class="w-0.5 flex-1 bg-gray-100 my-2 rounded-full"
                        ></div>
                      </div>

                      <!-- Content -->
                      <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-2">
                          <h4 class="font-bold text-gray-900 text-base leading-tight group-hover:text-blue-700 transition-colors">
                            {{ activity.name }}
                          </h4>
                          
                          <!-- Actions -->
                          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <button 
                              @click.stop="handleEdit(activity)" 
                              class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="編輯"
                            >
                              <PencilSquareIcon class="w-4 h-4" />
                            </button>
                            <button 
                              @click.stop="handleDelete(activity.id)" 
                              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="刪除"
                            >
                              <TrashIcon class="w-4 h-4" />
                            </button>
                            <div class="drag-handle cursor-move p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors">
                              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <!-- Metadata -->
                        <div class="flex items-center gap-3 text-sm mb-2 flex-wrap">
                          <div v-if="activity.start_time" class="flex items-center gap-1.5 text-gray-700 font-medium">
                            <ClockIcon class="w-4 h-4 text-blue-500" />
                            <span>{{ activity.start_time?.substring(0, 5) }}</span>
                            <span v-if="activity.end_time" class="text-gray-400">-</span>
                            <span v-if="activity.end_time">{{ activity.end_time?.substring(0, 5) }}</span>
                          </div>
                          
                          <div v-if="activity.duration" class="flex items-center gap-1.5 text-gray-500 text-xs">
                            <span class="w-1 h-1 rounded-full bg-gray-300"></span>
                            停留 {{ activity.duration }} 分鐘
                          </div>
                        </div>

                        <div v-if="activity.location" class="flex items-start gap-1.5 text-sm text-gray-600 mb-2 group-hover:text-gray-900 transition-colors">
                          <MapPinIcon class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span class="line-clamp-1">{{ activity.location }}</span>
                        </div>
                        
                        <p v-if="activity.notes" class="text-sm text-gray-500 line-clamp-2 bg-gray-50 rounded-lg px-3 py-2 italic border border-gray-100">
                          {{ activity.notes }}
                        </p>
                      </div>
                    </div>
                  </div>
                </template>
              </draggable>
              
              <!-- Empty State -->
              <div v-if="localActivities.length === 0" class="text-center py-16">
                <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                  <MapIcon class="w-10 h-10 text-blue-300" />
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">還沒有安排行程</h3>
                <p class="text-gray-500 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                  點擊右上角「新增景點」按鈕，或使用右側 AI 助手為您智能推薦景點
                </p>
                <div class="flex justify-center gap-3">
                  <button 
                    @click="isAddModalOpen = true"
                    class="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
                  >
                    手動新增
                  </button>
                  <button 
                    @click="{ isAISidebarOpen = true; activeMobileTab = 'ai'; }"
                    class="px-6 py-2.5 border-2 border-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-50 hover:border-blue-200 transition-colors"
                  >
                    AI 推薦
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Area: AI Assistant (Collapsible) -->
      <aside 
        class="bg-white border-l border-gray-200 shadow-2xl z-30 flex flex-col transition-all duration-300 ease-in-out relative overflow-visible"
        :class="[
          isAISidebarOpen ? 'w-full lg:w-[400px] xl:w-[450px]' : 'w-0',
          activeMobileTab === 'itinerary' ? 'hidden lg:flex' : 'flex'
        ]"
      >
        <!-- Toggle Button (Desktop Only) -->
        <button 
          @click="toggleAISidebar"
          class="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 bg-white border border-gray-200 text-gray-500 hover:text-blue-600 shadow-md w-8 h-12 rounded-l-xl items-center justify-center z-40 transition-transform hover:-translate-x-0.5"
          :title="isAISidebarOpen ? '收起 AI 助手' : '展開 AI 助手'"
        >
          <ChevronRightIcon v-if="!isAISidebarOpen" class="w-5 h-5" />
          <ChevronLeftIcon v-else class="w-5 h-5" />
        </button>

        <div v-if="isAISidebarOpen" class="h-full flex flex-col overflow-hidden">
          <AIAssistant 
            v-if="currentTrip"
            :is-open="isAISidebarOpen"
            :destination="currentTrip.destination"
            :day-number="dayNumber"
            @add-activity="handleAddAI"
            @close="isAISidebarOpen = false"
          />
        </div>
      </aside>
    </div>

    <!-- Modals -->
    <AddActivityModal
      v-if="currentItinerary"
      :is-open="isAddModalOpen"
      :itinerary-id="currentItinerary.id"
      :trip-id="tripId"
      :current-order="localActivities.length" 
      @close="isAddModalOpen = false"
      @success="handleSuccess"
    />

    <EditActivityModal
      :is-open="isEditModalOpen"
      :activity="selectedActivity"
      @close="isEditModalOpen = false"
      @success="handleSuccess"
    />
  </div>
</template>

<style scoped>
/* Custom Scrollbar for Itinerary List */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

/* Draggable styles */
:deep(.scale-105) {
  transform: scale(1.05);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
  z-index: 50;
  cursor: grabbing;
}

/* Leaflet control z-index fix */
:deep(.leaflet-top) {
  z-index: 400;
}

.animate-bounce-slow {
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(-5%);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}
</style>
