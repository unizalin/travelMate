<template>
  <div class="h-screen w-screen flex overflow-hidden relative">
      <!-- Sidebar -->
      <Transition
        enter-active-class="transform transition ease-in-out duration-300"
        enter-from-class="-translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transform transition ease-in-out duration-300"
        leave-from-class="translate-x-0"
        leave-to-class="-translate-x-full"
      >
        <DaySidebar 
            v-if="isSidebarOpen"
            :itineraries="itineraries" 
            @select-day="handleSelectDay"
            @close="isSidebarOpen = false"
            class="absolute top-0 left-0 h-full z-20"
        />
      </Transition>

      <!-- Toggle Sidebar Button (when closed) -->
      <button 
        v-if="!isSidebarOpen"
        @click="isSidebarOpen = true"
        class="absolute top-4 left-4 z-10 bg-white p-2 rounded-lg shadow-md hover:bg-gray-50"
      >
        <Bars3Icon class="w-6 h-6 text-gray-700" />
      </button>

      <!-- Map Area -->
      <div class="flex-1 relative h-full">
         <TripMapView
          v-if="allActivities.length > 0"
          :activities="allActivities"
          :show-route="showRoute"
          :origin="originCoords"
          @marker-click="handleMarkerClick"
        />

        <!-- Top Right Controls -->
        <div class="absolute top-4 right-4 z-10 flex flex-col gap-2">
           <button @click="$router.back()" class="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50">
             <span class="sr-only">Close</span>
             <XMarkIcon class="w-6 h-6 text-gray-700" />
           </button>
           
           <button 
             @click="showRoute = !showRoute"
             :class="showRoute ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'"
             class="p-2 rounded-lg shadow-md transition-colors"
             title="Toggle Route"
           >
             <MapIcon class="w-6 h-6" />
           </button>
        </div>
        
        <!-- Bottom Info -->
         <div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg z-10 text-sm font-medium text-gray-700">
           {{ trip?.destination }} · {{ totalDays }} 天 · {{ allActivities.length }} 個景點
         </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTripStore } from '@/stores/trip';
import { useItineraryStore } from '@/stores/itinerary';
import TripMapView from '@/components/map/TripMapView.vue';
import DaySidebar from '@/components/trip/DaySidebar.vue';
import { Bars3Icon, MapIcon, XMarkIcon } from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const tripId = route.params.tripId as string;

const tripStore = useTripStore();
const itineraryStore = useItineraryStore();

const isSidebarOpen = ref(true);
const showRoute = ref(true);

const trip = computed(() => tripStore.currentTrip);
const itineraries = computed(() => itineraryStore.itineraries);

const totalDays = computed(() => {
  if (!trip.value) return 0;
  const start = new Date(trip.value.start_date);
  const end = new Date(trip.value.end_date);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
});

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

const originCoords = ref({ lat: 25.0330, lng: 121.5654, name: 'Start' }); // Can be improved to use real start location

const handleSelectDay = (dayNumber: number) => {
    router.push(`/trips/${tripId}/day/${dayNumber}`);
};

const handleMarkerClick = (activityId: string) => {
    // Possibly find the day and navigate
    const activity = allActivities.value.find(a => a.id === activityId);
    if(activity) {
        handleSelectDay(activity.dayNumber);
    }
};

onMounted(async () => {
    if (!trip.value) {
        await tripStore.fetchTripById(tripId);
    }
    if (trip.value) {
        await itineraryStore.fetchItineraries(tripId, trip.value.start_date, trip.value.end_date);
    }
});
</script>
