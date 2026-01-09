<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="h-16 border-b bg-white px-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button @click="$router.back()" class="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeftIcon class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-xl font-bold">{{ trip?.destination }}</h1>
          <p class="text-sm text-gray-500">{{ tripDuration }}</p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <button 
          @click="viewMode = 'map'"
          :class="viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          地圖總覽
        </button>
        <button 
          @click="viewMode = 'list'"
          :class="viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          行程列表
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Map Area -->
      <div class="flex-1 relative">
        <TripMapView
          v-if="allActivities.length > 0"
          :activities="allActivities"
          :show-route="true"
          :origin="originCoords"
          :destination="destinationCoords"
          :highlighted-id="highlightedActivityId"
          @marker-click="handleMarkerClick"
          @activity-click="handleActivityClick"
        />
        
        <!-- Loading State -->
        <div v-else class="flex items-center justify-center h-full bg-gray-50">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="text-gray-600">載入地圖中...</p>
          </div>
        </div>
      </div>

      <!-- Right Panel: Itinerary Overview -->
      <aside v-if="viewMode === 'list' || viewMode === 'map'" class="w-96 bg-white border-l overflow-y-auto z-10">
        <div class="p-6">
          <h2 class="text-lg font-bold mb-4">行程概覽</h2>
          
          <!-- Day Tabs -->
          <div class="flex flex-wrap gap-2 mb-6">
            <button
              v-for="day in totalDays"
              :key="day"
              @click="scrollToDay(day)"
              class="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-gray-200"
            >
              第 {{ day }} 天
            </button>
          </div>

          <!-- Activities by Day -->
          <div v-for="(dayItinerary, index) in itineraries" :key="dayItinerary.id" :id="'day-' + (index + 1)" class="mb-6">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                D{{ index + 1 }}
              </div>
              <div>
                <h3 class="font-bold text-gray-900">第 {{ index + 1 }} 天</h3>
                <p class="text-xs text-gray-500">{{ formatDate(dayItinerary.date) }}</p>
              </div>
            </div>
            
            <div class="ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
              <div
                v-for="(activity, actIndex) in dayItinerary.activities"
                :key="activity.id"
                @click="handleActivityClick(activity)"
                :class="{'bg-blue-50 ring-2 ring-blue-500': highlightedActivityId === activity.id}"
                class="cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition-all"
              >
                <div class="flex items-start gap-2">
                  <div class="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {{ Number(actIndex) + 1 }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-sm text-gray-900 truncate">{{ activity.name }}</h4>
                    <p class="text-xs text-gray-500 truncate">{{ activity.location }}</p>
                    <p v-if="activity.start_time" class="text-xs text-gray-400 mt-1">
                      {{ activity.start_time?.substring(0, 5) }}
                    </p>
                  </div>
                </div>
              </div>
              
              <div v-if="!dayItinerary.activities || dayItinerary.activities.length === 0" class="text-sm text-gray-400 italic">
                尚未規劃行程
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ChevronLeftIcon } from '@heroicons/vue/24/outline';
import { useTripStore } from '@/stores/trip';
import { useItineraryStore } from '@/stores/itinerary';
import TripMapView from '@/components/map/TripMapView.vue';

const route = useRoute();
const tripId = route.params.tripId as string;

const tripStore = useTripStore();
const itineraryStore = useItineraryStore();

const viewMode = ref<'map' | 'list'>('map');
const highlightedActivityId = ref<string | null>(null);

const trip = computed(() => tripStore.currentTrip);
const itineraries = computed(() => itineraryStore.itineraries);

const totalDays = computed(() => {
  if (!trip.value) return 0;
  const start = new Date(trip.value.start_date);
  const end = new Date(trip.value.end_date);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
});

const tripDuration = computed(() => {
  if (!trip.value) return '';
  const start = new Date(trip.value.start_date);
  const end = new Date(trip.value.end_date);
  return `${start.toLocaleDateString('zh-TW')} - ${end.toLocaleDateString('zh-TW')} · ${totalDays.value} 天`;
});

// 收集所有景點 (Collect all activities)
const allActivities = computed(() => {
  const activities: any[] = [];
  itineraries.value.forEach((itinerary, dayIndex) => {
    itinerary.activities?.forEach((activity: any, actIndex: number) => {
      // Allow even if lat/lng missing initially, as TripMapView will sort it out or geocode
      activities.push({
        ...activity,
        dayNumber: dayIndex + 1,
        orderInDay: actIndex + 1
      });
    });
  });
  return activities;
});

// 起點座標（例如：台北）
const originCoords = ref({ lat: 25.0330, lng: 121.5654, name: '台北' });

// 終點座標（自動計算為第一個景點）
const destinationCoords = computed(() => {
  const firstActivity = allActivities.value.find(a => a.latitude && a.longitude);
  if (firstActivity) {
    return {
      lat: firstActivity.latitude,
      lng: firstActivity.longitude,
      name: trip.value?.destination || '目的地'
    };
  }
  return undefined;
});

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
};

const handleMarkerClick = (activityId: string) => {
  highlightedActivityId.value = activityId;
  scrollToActivity(activityId);
};

const handleActivityClick = (activity: any) => {
  highlightedActivityId.value = activity.id;
  // If in list mode or map mode, we highlight.
  // TripMapView watches highlightedId and will pan to it.
};

const scrollToDay = (day: number) => {
    const el = document.getElementById(`day-${day}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
};

const scrollToActivity = (activityId: string) => {
    // We don't have IDs on activity elements easily without ref usage in loop,
    // but we can try to find by text or add IDs to elements.
    // For now, let's just ensure the day is visible.
    const activity = allActivities.value.find(a => a.id === activityId);
    if(activity) {
        scrollToDay(activity.dayNumber);
    }
}

onMounted(async () => {
  if (!trip.value) {
    await tripStore.fetchTrips();
    const foundTrip = tripStore.trips.find((t: any) => t.id === tripId);
    if (foundTrip) {
      tripStore.currentTrip = foundTrip;
    }
  }
  
  if (trip.value) {
    await itineraryStore.fetchItineraries(tripId, trip.value.start_date, trip.value.end_date);
  }
});
</script>
