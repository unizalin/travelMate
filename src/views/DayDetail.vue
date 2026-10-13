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
  TrashIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import draggable from 'vuedraggable';
import { useToast } from '@/composables/useToast';
import { useDialog } from '@/composables/useDialog';
import { mapboxService } from '@/services/mapboxService';
import { aiSchedulingService } from '@/services/aiSchedulingService';
import ActivityTravelTime from '@/components/trip/ActivityTravelTime.vue';

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
const routeOptimizing = ref(false); // Renamed from isOptimizing
const smartBlocks = ref<any[]>([]); // Added for AI suggestions
const loadingSmartBlocks = ref(false); // Added for AI suggestions loading state
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
async function saveNewOrder() {
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
    // This part is tricky if `localActivities` is already updated by `optimizeRoute`
    // For now, we'll just re-fetch to ensure consistency.
    await itineraryStore.fetchItineraries(tripId, currentTrip.value?.start_date, currentTrip.value?.end_date);
  }
}

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

async function optimizeRoute() {
  if (localActivities.value.length < 2) {
    showToast('景點數量不足，無法優化', 'info');
    return;
  }

  // Check if all activities have coordinates
  const activitiesWithCoords = localActivities.value.filter(a => (a.latitude && a.longitude) || (a.start_location_lat && a.start_location_lng));
  
  if (activitiesWithCoords.length < localActivities.value.length) {
    showToast('部分景點缺少座標，請先設定地點', 'warning');
    return;
  }

  try {
    routeOptimizing.value = true;
    const coords: [number, number][] = localActivities.value.map(a => [
      a.longitude || a.start_location_lng,
      a.latitude || a.start_location_lat
    ]);

    const optimizedIndices = await mapboxService.getOptimizedOrder(coords);
    const optimizedList = optimizedIndices.map(index => localActivities.value[index]);
    
    localActivities.value = optimizedList;
    await saveNewOrder(); // Save the new order to the backend
    showToast('順序已優化！', 'success');
  } catch (error) {
    console.error(error);
    showToast('排程優化失敗', 'error');
  } finally {
    routeOptimizing.value = false;
  }
}

async function fetchSmartBlocks() {
    if (localActivities.value.length === 0) return;
    try {
        loadingSmartBlocks.value = true;
        const blocks = await aiSchedulingService.getSmartBlocks(localActivities.value, {
            destination: currentTrip.value?.destination || ''
        });
        smartBlocks.value = blocks;
        if (blocks.length > 0) {
            showToast(`AI 建議了 ${blocks.length} 個行程優化點`, 'info');
        } else {
            showToast('AI 認為目前的行程安排非常完美！', 'success');
        }
    } catch (e) {
        console.error('Smart blocks fetch error:', e);
        showToast('AI 建議獲取失敗', 'error');
    } finally {
        loadingSmartBlocks.value = false;
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

function hasCoordinates(activity: any) {
    return (activity.latitude && activity.longitude) || (activity.start_location_lat && activity.start_location_lng);
}
</script>

<template>
  <div class="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white dark:bg-secondary-950 transition-colors">
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
          <div v-if="isLoading" class="absolute inset-0 bg-white/80 dark:bg-secondary-950/80 backdrop-blur-sm z-10 flex items-center justify-center transition-all">
            <div class="relative w-12 h-12">
              <div class="absolute inset-0 border-3 border-primary-500/10 rounded-full"></div>
              <div class="absolute inset-0 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>

          <!-- Map Controls -->
          <div class="absolute top-6 right-6 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-md rounded-2xl shadow-xl px-4 py-2.5 text-xs z-10 border border-gray-100 dark:border-white/5 hidden md:block transition-all">
            <div class="flex items-center gap-2.5">
              <div class="w-6 h-6 bg-primary-600 text-white rounded-lg flex items-center justify-center font-black text-[10px] shadow-lg shadow-primary-500/20">
                1
              </div>
              <span class="text-gray-900 dark:text-white font-black uppercase tracking-widest">{{ localActivities.length }} 個景點</span>
            </div>
          </div>
          
          <button 
            v-if="localActivities.length > 1"
            @click="mapRef?.fitBounds()"
            class="absolute bottom-6 right-6 bg-white dark:bg-secondary-900 text-gray-900 dark:text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-black uppercase tracking-widest transition-all z-10 flex items-center gap-2 border border-gray-100 dark:border-white/5 hover:scale-105 active:scale-95"
          >
            <MapIcon class="w-4 h-4 text-primary-500" />
            顯示全部
          </button>

          <button 
            v-if="localActivities.length > 1"
            @click="showRoute = !showRoute"
            class="absolute bottom-20 right-6 bg-white dark:bg-secondary-900 px-5 py-3 rounded-2xl shadow-xl text-xs font-black uppercase tracking-widest transition-all z-10 flex items-center gap-2 border border-gray-100 dark:border-white/5 hover:scale-105 active:scale-95"
            :class="showRoute ? 'text-primary-600 dark:text-primary-400 border-primary-100 dark:border-primary-500/20' : 'text-gray-500 dark:text-white/40'"
          >
            <MapPinIcon class="w-4 h-4" />
            {{ showRoute ? '隱藏路線' : '顯示路線' }}
          </button>

          <!-- Mobile Tab Switcher (Floating) -->
          <div class="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 flex bg-white/80 dark:bg-secondary-900/80 backdrop-blur-md rounded-full shadow-2xl border border-gray-100 dark:border-white/10 p-1.5 z-20">
            <button 
              @click="activeMobileTab = 'itinerary'"
              :class="[
                'px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                activeMobileTab === 'itinerary' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 dark:text-white/20'
              ]"
            >
              <ListBulletIcon class="w-4 h-4" />
              行程
            </button>
            <button 
              @click="activeMobileTab = 'ai'"
              :class="[
                'px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                activeMobileTab === 'ai' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 dark:text-white/20'
              ]"
            >
              <SparklesIcon class="w-4 h-4" />
              AI 助手
            </button>
          </div>
        </div>

        <!-- Itinerary List Section (60% height) -->
        <div class="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-secondary-950 transition-colors">
          <!-- List Toolbar -->
          <div class="px-6 py-5 bg-white dark:bg-secondary-900 border-b border-gray-100 dark:border-white/5 flex flex-wrap gap-4 items-center justify-between shadow-sm z-10 transition-colors">
            <div class="flex items-center gap-4">
              <button 
                @click="$router.back()" 
                class="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all text-gray-400 dark:text-white/20"
                title="返回"
              >
                <ChevronLeftIcon class="w-6 h-6" />
              </button>
              
              <div>
                <p class="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em] mb-0.5">{{ formattedDate }}</p>
                <h1 class="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  第 {{ dayNumber }} 天
                  <span class="px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-[10px] font-black rounded-lg border border-primary-100 dark:border-primary-500/10 uppercase tracking-widest">
                    {{ localActivities.length }} 個景點
                  </span>
                </h1>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <button 
                @click="isEditMode = !isEditMode"
                :class="[
                  'flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border',
                  isEditMode 
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-500/20 shadow-inner' 
                    : 'bg-white dark:bg-white/5 text-gray-500 dark:text-white/40 border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10'
                ]"
              >
                <PencilSquareIcon class="w-4 h-4" />
                {{ isEditMode ? '完成' : '編輯' }}
              </button>
 
              <button 
              @click="fetchSmartBlocks"
              :disabled="loadingSmartBlocks || localActivities.length === 0"
              class="flex items-center gap-2 px-4 py-2 bg-secondary-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10 dark:shadow-white/5 disabled:opacity-20"
            >
              <SparklesIcon class="w-4 h-4" :class="{'animate-pulse text-primary-500': loadingSmartBlocks}" />
              {{ loadingSmartBlocks ? '分析中...' : '智慧洞察' }}
            </button>

            <button 
              @click="optimizeRoute"
              :disabled="routeOptimizing || localActivities.length < 2"
              class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-20"
            >
              <ArrowPathIcon class="w-4 h-4" :class="{'animate-spin': routeOptimizing}" />
              路徑優化
            </button>
 
              <button 
                @click="isAddModalOpen = true"
                class="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-500/20 active:scale-95"
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
                      <!-- Activity Card -->
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
                        class="bg-white dark:bg-secondary-900/40 backdrop-blur-3xl rounded-[2rem] p-6 border-2 transition-all duration-500 flex gap-6 group cursor-pointer relative overflow-hidden"
                        :class="[
                          highlightedActivityId === activity.id 
                            ? 'border-primary-500 shadow-2xl shadow-primary-500/20 scale-[1.02] z-10' 
                            : 'border-transparent hover:border-gray-200 dark:hover:border-white/10 hover:shadow-xl dark:shadow-2xl'
                        ]"
                      >
                        <!-- ... (Activity Card Content remains same) -->
                        <!-- Highlight Indicator -->
                        <div 
                          v-if="highlightedActivityId === activity.id"
                          class="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-500"
                        ></div>
                        
                        <!-- Index Badge -->
                        <div class="flex-shrink-0 flex flex-col items-center pt-1">
                          <div 
                            class="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-lg transition-all duration-500"
                            :class="[
                              highlightedActivityId === activity.id 
                                ? 'bg-primary-600 text-white translate-y-[-2px] rotate-6' 
                                : 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-white/20 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-600 dark:group-hover:text-primary-400'
                            ]"
                          >
                            {{ index + 1 }}
                          </div>
                        </div>

                        <!-- Content -->
                        <div class="flex-1 min-w-0">
                          <div class="flex justify-between items-start mb-2">
                            <h4 class="font-black text-gray-900 dark:text-white text-lg leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                              {{ activity.name }}
                            </h4>
                            
                            <!-- Actions -->
                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                              <button 
                                @click.stop="handleEdit(activity)" 
                                class="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all"
                                title="編輯"
                              >
                                <PencilSquareIcon class="w-5 h-5" />
                              </button>
                              <button 
                                @click.stop="handleDelete(activity.id)" 
                                class="p-2 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                                title="刪除"
                              >
                                <TrashIcon class="w-5 h-5" />
                              </button>
                              <div class="drag-handle cursor-move p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all">
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          <!-- Metadata -->
                          <div class="flex items-center gap-4 text-sm mb-3 flex-wrap">
                            <div v-if="activity.start_time" class="flex items-center gap-2 text-gray-900 dark:text-white font-black">
                              <ClockIcon class="w-4 h-4 text-primary-500" />
                              <span class="text-[10px] uppercase tracking-widest">{{ activity.start_time?.substring(0, 5) }}</span>
                              <span v-if="activity.end_time" class="text-gray-300 dark:text-white/10">-</span>
                              <span v-if="activity.end_time" class="text-[10px] uppercase tracking-widest">{{ activity.end_time?.substring(0, 5) }}</span>
                            </div>
                            
                            <div class="w-1 h-1 rounded-full bg-primary-500/30"></div>
                            <span class="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em]">預計停留 {{ activity.duration }} 分鐘</span>
                          </div>
   
                          <div v-if="activity.location" class="flex items-start gap-2 text-xs text-gray-500 dark:text-white/40 mb-3 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-bold">
                            <MapPinIcon class="w-4 h-4 text-gray-300 dark:text-white/10 flex-shrink-0 mt-0.5" />
                            <span class="line-clamp-1 uppercase tracking-widest">{{ activity.location }}</span>
                          </div>
                          
                          <div v-if="activity.notes" class="text-[11px] text-gray-500 dark:text-white/30 line-clamp-2 bg-gray-50 dark:bg-black/20 rounded-2xl px-4 py-3 font-medium border border-gray-100 dark:border-white/5 italic">
                            {{ activity.notes }}
                          </div>
                        </div>
                      </div>

                      <!-- Travel Time (Between Cards) -->
                      <ActivityTravelTime 
                        v-if="index < localActivities.length - 1 && hasCoordinates(activity) && hasCoordinates(localActivities[index+1])"
                        :start="[activity.longitude || activity.start_location_lng, activity.latitude || activity.start_location_lat]"
                        :end="[localActivities[index+1].longitude || localActivities[index+1].start_location_lng, localActivities[index+1].latitude || localActivities[index+1].start_location_lat]"
                      />

                      <!-- Smart AI Suggested Block -->
                      <div v-if="smartBlocks.find(b => b.insertAfterId === activity.id)" class="py-4 px-6 my-2 bg-primary-500/5 dark:bg-primary-500/10 border border-dashed border-primary-500/30 rounded-[1.5rem] animate-in slide-in-from-top-4 duration-500">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-primary-500/20 rounded-xl">
                                <SparklesIcon class="w-4 h-4 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-0.5">AI 建議行程</p>
                                <p class="text-xs font-bold text-gray-700 dark:text-white/80 italic">
                                    {{ smartBlocks.find(b => b.insertAfterId === activity.id).suggestion }}
                                </p>
                            </div>
                            <button @click="smartBlocks = smartBlocks.filter(b => b.insertAfterId !== activity.id)" class="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <XMarkIcon class="w-4 h-4" />
                            </button>
                        </div>
                      </div>
                    </div>
                </template>
              </draggable>
              
              <!-- Empty State -->
              <div v-if="localActivities.length === 0" class="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in-up">
                <div class="relative mb-10">
                  <div class="absolute inset-0 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
                  <div class="relative w-24 h-24 bg-white dark:bg-secondary-900 rounded-[2rem] border border-gray-100 dark:border-white/5 flex items-center justify-center shadow-2xl transition-all">
                    <MapPinIcon class="w-12 h-12 text-primary-500" />
                  </div>
                </div>
                <h3 class="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">尚無行程數據</h3>
                <p class="text-sm font-bold text-gray-400 dark:text-white/20 mb-10 max-w-xs mx-auto leading-relaxed">
                  開始規劃您的旅程，手動新增景點或讓 AI 助手為您推薦完美去處。
                </p>
                <div class="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-xs mx-auto">
                  <button 
                    @click="isAddModalOpen = true"
                    class="flex-1 px-8 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-500 transition-all shadow-xl shadow-primary-500/20 active:scale-95"
                  >
                    新增景點
                  </button>
                  <button 
                    @click="{ isAISidebarOpen = true; activeMobileTab = 'ai'; }"
                    class="flex-1 px-8 py-4 bg-white dark:bg-white/5 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-50 transition-all active:scale-95"
                  >
                    AI 推薦行程
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Area: AI Assistant (Collapsible) -->
      <aside 
        class="bg-white dark:bg-secondary-950 border-l border-gray-100 dark:border-white/5 shadow-2xl z-30 flex flex-col transition-all duration-300 ease-in-out relative overflow-visible"
        :class="[
          isAISidebarOpen ? 'w-full lg:w-[400px] xl:w-[450px]' : 'w-0',
          activeMobileTab === 'itinerary' ? 'hidden lg:flex' : 'flex'
        ]"
      >
        <!-- Toggle Button (Desktop Only) -->
        <button 
          @click="toggleAISidebar"
          class="hidden lg:flex absolute -left-5 top-1/2 -translate-y-1/2 bg-white dark:bg-secondary-900 border border-gray-100 dark:border-white/5 text-gray-400 dark:text-white/20 hover:text-primary-500 shadow-2xl w-10 h-16 rounded-l-[1.5rem] items-center justify-center z-40 transition-all hover:scale-105 active:scale-95"
          :title="isAISidebarOpen ? '收起 AI 助手' : '展開 AI 助手'"
        >
          <ChevronRightIcon v-if="!isAISidebarOpen" class="w-6 h-6" />
          <ChevronLeftIcon v-else class="w-6 h-6 rotate-180" />
        </button>

        <div v-if="isAISidebarOpen" class="h-full flex flex-col overflow-hidden">
          <AIAssistant 
            v-if="currentTrip"
            :is-open="isAISidebarOpen"
            :trip-id="tripId"
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
