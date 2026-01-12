<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden relative bg-secondary-50">
      <!-- Header Area -->
      <header class="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-secondary-100 z-30 shadow-sm">
        <div class="px-6 h-16 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button @click="$router.back()" class="p-2 hover:bg-secondary-100 rounded-xl transition-colors text-secondary-600">
              <ChevronLeftIcon class="w-5 h-5" />
            </button>
            <div>
              <h1 class="text-xl font-heading font-bold text-secondary-900 leading-none">{{ trip?.destination }}</h1>
              <p class="text-xs text-secondary-500 font-body mt-1">共 {{ totalDays }} 天行程</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
             <button 
               @click="isSidebarOpen = !isSidebarOpen"
               class="p-2 hover:bg-secondary-100 rounded-xl transition-colors"
               :class="isSidebarOpen ? 'text-primary-600' : 'text-secondary-600'"
             >
               <Bars3Icon class="w-6 h-6" />
             </button>
          </div>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden relative">
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
              :active-day="selectedDayNumber"
              @select-day="handleSelectDay"
              @reorder="handleReorder"
              @close="isSidebarOpen = false"
              class="absolute top-0 left-0 h-full z-20 border-r"
          />
        </Transition>

        <!-- Map Area -->
        <div class="flex-1 relative h-full">
           <TripMapView
            v-if="currentDayActivities.length > 0"
            :activities="currentDayActivities"
            :show-route="showRoute"
            :origin="originCoords"
            @marker-click="handleMarkerClick"
          />

          <!-- Float Controls -->
          <div class="absolute top-4 right-4 z-10 flex flex-col gap-2">
             <button 
               @click="showRoute = !showRoute"
               :class="showRoute ? 'bg-primary-600 text-white shadow-primary-200' : 'bg-white text-secondary-700'"
               class="p-2.5 rounded-xl shadow-lg transition-all"
               title="Toggle Route"
             >
               <MapIcon class="w-5 h-5" />
             </button>
          </div>
          
          <!-- Bottom Info / Selection Hint -->
           <div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-2.5 rounded-2xl shadow-xl z-20 text-sm font-bold text-secondary-900 flex items-center gap-3 border border-secondary-100 animate-slide-up">
             <span class="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px]">D{{ selectedDayNumber }}</span>
             <span>第 {{ selectedDayNumber }} 天 · {{ currentDayActivities.length }} 個景點</span>
           </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useTripStore } from '@/stores/trip';
import { useItineraryStore } from '@/stores/itinerary';
import TripMapView from '@/components/map/TripMapView.vue';
import DaySidebar from '@/components/trip/DaySidebar.vue';
import { Bars3Icon, MapIcon, ChevronLeftIcon } from '@heroicons/vue/24/outline';

const route = useRoute();
const tripId = route.params.tripId as string;

const tripStore = useTripStore();
const itineraryStore = useItineraryStore();

const isSidebarOpen = ref(true);
const showRoute = ref(true);
const selectedDayNumber = ref(1);

const trip = computed(() => tripStore.currentTrip);
const itineraries = computed(() => itineraryStore.itineraries);

const totalDays = computed(() => {
  if (!trip.value) return 0;
  const start = new Date(trip.value.start_date);
  const end = new Date(trip.value.end_date);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
});

const currentDayActivities = computed(() => {
  const itinerary = itineraries.value[selectedDayNumber.value - 1];
  if (!itinerary || !itinerary.activities) return [];
  
  return itinerary.activities.map((activity: any, index: number) => ({
    ...activity,
    dayNumber: selectedDayNumber.value,
    orderInDay: index + 1
  }));
});

const originCoords = ref({ lat: 25.0330, lng: 121.5654, name: 'Start' });

const handleSelectDay = (dayNumber: number) => {
    selectedDayNumber.value = dayNumber;
};

const handleReorder = async (newItineraries: any[]) => {
  if (trip.value) {
    await itineraryStore.reorderItineraries(tripId, newItineraries, trip.value.start_date);
  }
};

const handleMarkerClick = (activityId: string) => {
    // Possibly highlight or show details
    console.log('Marker clicked:', activityId);
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

<style scoped>
.animate-slide-up {
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translate(-50%, 20px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}
</style>

