<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-gray-50"
       @touchstart="handleTouchStart"
       @touchend="handleTouchEnd">
      <!-- Map Area (Top) -->
      <div class="h-[40vh] relative flex-shrink-0">
          <TripMapView
            v-if="dayActivities.length > 0"
            :activities="dayActivities"
            :show-route="true"
            :origin="originCoords"
            @marker-click="scrollToActivity"
          />
           <div v-else class="h-full w-full bg-gray-200 flex items-center justify-center text-gray-500">
              地圖載入中或無景點...
           </div>

          <!-- Back Button -->
          <button @click="$router.push(`/trips/${tripId}`)" class="absolute top-4 left-4 z-10 bg-white/90 p-2 rounded-full shadow hover:bg-white">
             <ChevronLeftIcon class="w-6 h-6 text-gray-800" />
          </button>
          
           <!-- Map Controls -->
          <div class="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <button class="bg-white/90 px-3 py-1.5 rounded-lg shadow text-xs font-medium text-gray-700 hover:bg-white" @click="scrollToActivity(dayActivities[0]?.id)">
                  重點順序
              </button>
             <button class="bg-white/90 px-3 py-1.5 rounded-lg shadow text-xs font-medium text-gray-700 hover:bg-white">
                  顯示全部
              </button>
          </div>
      </div>

       <!-- Day Controls / Header -->
       <div class="bg-white px-4 py-3 shadow-sm border-b flex items-center justify-between shrink-0 z-10">
           <div class="flex items-center gap-3">
               <button @click="$router.push(`/trips/${tripId}`)" class="p-1 -ml-1 text-gray-400">
                    <ChevronLeftIcon class="w-5 h-5" />
               </button>
               <div>
                   <div class="flex items-center gap-2">
                       <h2 class="font-bold text-gray-900 text-lg">第 {{ dayNumber }} 天</h2>
                       <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{{ currentDateFormatted }}</span>
                   </div>
                   <p class="text-xs text-gray-500 mt-0.5">{{ dayActivities.length }} 個景點</p>
               </div>
           </div>
           
           <button @click="isAIOpen = true" class="flex items-center gap-1 bg-primary-50 text-primary-600 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-primary-100">
               <PlusIcon class="w-4 h-4" />
               新增景點
           </button>
       </div>

      <!-- Activities List (Bottom, Scrollable) -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3 relative" ref="listContainer">
          <div v-if="dayActivities.length === 0" class="text-center text-gray-500 py-10">
              這天還沒有行程，請點擊右下角 AI 助手開始規劃！
          </div>
          
          <ActivityCard
             v-for="(activity, index) in dayActivities"
             :key="activity.id"
             :id="'activity-' + activity.id"
             :activity="activity"
             :index="index + 1"
          />
      </div>

      <!-- AI Assistant Button -->
      <button 
        @click="isAIOpen = true"
        class="absolute bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform z-20"
      >
        <SparklesIcon class="w-7 h-7" />
      </button>

      <!-- AI Assistant Overlay -->
      <AIAssistant
        :is-open="isAIOpen"
        :destination="trip?.destination || ''"
        :day-number="dayNumber"
        @close="isAIOpen = false"
        @add-activity="handleAddActivity"
      />
      
      <AddActivityModal
        v-if="showAddModal"
        :is-open="showAddModal"
        :itinerary-id="currentItineraryId"
        :current-order="dayActivities.length"
        :trip-id="tripId"
        @close="showAddModal = false"
        @success="handleActivityAdded"
      />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTripStore } from '@/stores/trip';
import { useItineraryStore } from '@/stores/itinerary';
import TripMapView from '@/components/map/TripMapView.vue';
import ActivityCard from '@/components/trip/ActivityCard.vue';
import AIAssistant from '@/components/trip/AIAssistant.vue';
import AddActivityModal from '@/components/modals/AddActivityModal.vue';
import { ChevronLeftIcon, SparklesIcon, PlusIcon } from '@heroicons/vue/24/solid';

const route = useRoute();
const router = useRouter();
const tripId = route.params.tripId as string;
const dayNumber = computed(() => parseInt(route.params.dayNumber as string));

const tripStore = useTripStore();
const itineraryStore = useItineraryStore();

const isAIOpen = ref(false);
const listContainer = ref<HTMLElement | null>(null);
const showAddModal = ref(false);

const trip = computed(() => tripStore.currentTrip);
const itineraries = computed(() => itineraryStore.itineraries);

const currentItinerary = computed(() => {
    if (!itineraries.value || itineraries.value.length === 0) return null;
    return itineraries.value[dayNumber.value - 1];
});

const currentItineraryId = computed(() => currentItinerary.value?.id || '');

const dayActivities = computed(() => {
    return currentItinerary.value?.activities || [];
});

const currentDateFormatted = computed(() => {
    if(!currentItinerary.value?.date) return '';
    try {
        return new Date(currentItinerary.value.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
    } catch {
        return '';
    }
});

const originCoords = ref({ lat: 25.0330, lng: 121.5654, name: 'Start' });
const totalDays = computed(() => itineraries.value.length);

const scrollToActivity = (activityId?: string) => {
    if(!activityId) return;
    const el = document.getElementById('activity-' + activityId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Swipe Logic
const touchStartX = ref(0);
const touchEndX = ref(0);

const handleTouchStart = (e: TouchEvent) => {
    touchStartX.value = e.changedTouches[0].screenX;
};

const handleTouchEnd = (e: TouchEvent) => {
    touchEndX.value = e.changedTouches[0].screenX;
    handleSwipe();
};

const handleSwipe = () => {
    const diff = touchStartX.value - touchEndX.value;
    const threshold = 50; 
    
    if (Math.abs(diff) < threshold) return;

    if (diff > 0) {
        // Swipe Left -> Next Day
        if (dayNumber.value < totalDays.value) {
            router.push(`/trips/${tripId}/day/${dayNumber.value + 1}`);
        }
    } else {
        // Swipe Right -> Prev Day
        if (dayNumber.value > 1) {
            router.push(`/trips/${tripId}/day/${dayNumber.value - 1}`);
        } else {
             // Optional: Go back to overview if swiping right on first day?
             // router.push(`/trips/${tripId}`);
        }
    }
};

// AI Integration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleAddActivity = (suggestion: any) => {
    // For now, simpler implementation just opens modal
    // Ideally we pass data to it.
    showAddModal.value = true;
    console.log("Adding suggestion:", suggestion);
};

const handleActivityAdded = async () => {
     if (trip.value) {
        await itineraryStore.fetchItineraries(tripId, trip.value.start_date, trip.value.end_date);
    }
}

onMounted(async () => {
    if (!trip.value) {
        await tripStore.fetchTripById(tripId);
    }
    if (trip.value) {
        await itineraryStore.fetchItineraries(tripId, trip.value.start_date, trip.value.end_date);
    }
});

watch(() => route.params.dayNumber, () => {
    if(listContainer.value) listContainer.value.scrollTop = 0;
});
</script>
