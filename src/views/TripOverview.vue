<template>
  <div class="min-h-screen bg-secondary-50 flex flex-col">
    <!-- Header: Refined Glassmorphism -->
    <header class="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-secondary-100 px-6 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button @click="$router.back()" class="p-2 hover:bg-secondary-100 rounded-xl transition-colors text-secondary-600">
          <ChevronLeftIcon class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-xl font-heading font-bold text-secondary-900 leading-none">{{ trip?.destination }}</h1>
          <p class="text-xs text-secondary-500 font-body mt-1">{{ tripDuration }}</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <div class="bg-secondary-100 p-1 rounded-xl flex gap-1">
          <button 
            @click="viewMode = 'list'"
            :class="viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'"
            class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
          >
            <ViewColumnsIcon class="w-4 h-4" />
            列表預覽
          </button>
          <button 
            @click="viewMode = 'map'"
            :class="viewMode === 'map' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'"
            class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
          >
            <MapIcon class="w-4 h-4" />
            地圖模式
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto">
      <!-- Grid View -->
      <div v-if="viewMode === 'list'" class="max-w-[1440px] mx-auto p-6 md:p-10">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 class="text-3xl font-heading font-bold text-secondary-900">行程總覽</h2>
            <p class="text-secondary-500 mt-2 font-body max-w-lg">
              預計造訪 {{ totalActivitiesCount }} 個景點，包含 {{ totalDurationHours }} 小時的行程安排。
            </p>
          </div>
          
          <div class="flex items-center gap-3">
             <UIBadge variant="primary" size="sm" class="px-4 py-2 rounded-xl">
               共 {{ totalDays }} 天
             </UIBadge>
          </div>
        </div>

        <!-- Responsive Grid: 1 (Mobile) / 2 (Tablet) / 4 (Desktop) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          <DayCard
            v-for="(itinerary, index) in itineraries"
            :key="itinerary.id"
            :itinerary="itinerary"
            :index="index + 1"
            class="h-full"
            @click="goToTripDetail"
            @add-activity="handleAddActivity"
          />
        </div>
      </div>

      <!-- Map View (Fullscreen style) -->
      <div v-else class="h-[calc(100vh-4rem)] relative">
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
        
        <div v-else class="flex items-center justify-center h-full bg-secondary-50">
          <div class="text-center">
            <UISpinner size="lg" variant="primary" class="mx-auto mb-4" />
            <p class="text-secondary-500 font-body">載入地圖中...</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronLeftIcon, MapIcon, ViewColumnsIcon } from '@heroicons/vue/24/outline';
import { useTripStore } from '@/stores/trip';
import { useItineraryStore } from '@/stores/itinerary';
import DayCard from '@/components/trip/DayCard.vue';
import TripMapView from '@/components/map/TripMapView.vue';
import UIBadge from '@/components/ui/Badge.vue';
import UISpinner from '@/components/ui/Spinner.vue';

const route = useRoute();
const router = useRouter();
const tripId = route.params.tripId as string;

const tripStore = useTripStore();
const itineraryStore = useItineraryStore();

const viewMode = ref<'map' | 'list'>('list');
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

const totalActivitiesCount = computed(() => {
  return itineraries.value.reduce((acc, curr) => acc + (curr.activities?.length || 0), 0);
});

const totalDurationHours = computed(() => {
  const totalMin = itineraries.value.reduce((acc, curr) => {
    return acc + (curr.activities?.reduce((a: number, c: any) => a + (Number(c.duration) || 0), 0) || 0);
  }, 0);
  return (totalMin / 60).toFixed(1);
});

// 收集所有景點 (Collect all activities)
const allActivities = computed(() => {
  const activities: any[] = [];
  itineraries.value.forEach((itinerary, dayIndex) => {
    itinerary.activities?.forEach((activity: any, actIndex: number) => {
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

// 終點座標
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

const handleMarkerClick = (activityId: string) => {
  highlightedActivityId.value = activityId;
};

const handleActivityClick = (activity: any) => {
  highlightedActivityId.value = activity.id;
};

const goToTripDetail = () => {
  router.push(`/trips/${tripId}/itinerary`);
};

const handleAddActivity = () => {
    goToTripDetail();
};

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

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
