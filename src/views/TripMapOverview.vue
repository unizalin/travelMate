<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden relative bg-[#020617] mesh-gradient-dark text-white selection:bg-primary-500/30">
      <!-- Header Area -->
      <header class="flex-shrink-0 bg-secondary-900/40 backdrop-blur-3xl border-b border-white/10 z-30 shadow-2xl ring-1 ring-white/5">
        <div class="px-8 h-20 flex items-center justify-between">
          <div class="flex items-center gap-6">
            <button @click="$router.back()" class="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95 border border-white/5 text-white/70 hover:text-white">
              <ChevronLeftIcon class="w-6 h-6" />
            </button>
            <div class="group">
              <h1 class="text-2xl font-black tracking-tight text-white leading-none group-hover:text-primary-400 transition-colors">{{ trip?.destination }}</h1>
              <p class="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mt-2 group-hover:text-white/60 transition-colors">Mission Horizon · {{ totalDays }} Days</p>
            </div>
          </div>

          <div class="flex items-center gap-4">
             <button 
               @click="isSidebarOpen = !isSidebarOpen"
               class="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95 border border-white/5"
               :class="isSidebarOpen ? 'text-primary-400 border-primary-500/30 shadow-[0_0_20px_rgba(var(--color-primary-500),0.2)]' : 'text-white/70'"
             >
               <Bars3Icon class="w-7 h-7" />
             </button>
          </div>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden relative">
        <!-- Sidebar -->
        <Transition
          enter-active-class="transform transition ease-in-out duration-500"
          enter-from-class="-translate-x-full opacity-0 scale-95"
          enter-to-class="translate-x-0 opacity-100 scale-100"
          leave-active-class="transform transition ease-in-out duration-500"
          leave-from-class="translate-x-0 opacity-100 scale-100"
          leave-to-class="-translate-x-full opacity-0 scale-95"
        >
          <DaySidebar 
              v-if="isSidebarOpen"
              :itineraries="itineraries" 
              :active-day="selectedDayNumber"
              @select-day="handleSelectDay"
              @reorder="handleReorder"
              @close="isSidebarOpen = false"
              class="absolute top-4 left-4 h-[calc(100%-2rem)] z-20 border-white/10 bg-secondary-900/40 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
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
          <div class="absolute top-8 right-8 z-10 flex flex-col gap-4">
             <button 
               @click="showRoute = !showRoute"
               :class="showRoute ? 'bg-primary-500 text-white shadow-xl border-primary-400' : 'bg-secondary-900/40 text-white/70 border-white/10'"
               class="p-4 rounded-3xl backdrop-blur-3xl shadow-2xl transition-all active:scale-90 border ring-1 ring-white/5"
               title="Toggle Route"
             >
               <MapIcon class="w-6 h-6" />
             </button>
          </div>
          
          <!-- Bottom Info / Selection Hint -->
           <div class="absolute bottom-10 left-1/2 -translate-x-1/2 bg-secondary-900/40 backdrop-blur-3xl px-10 py-5 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] z-20 text-[10px] font-black tracking-[0.3em] uppercase text-white/80 flex items-center gap-5 border border-white/10 ring-1 ring-white/5 animate-slide-up group">
             <span class="w-8 h-8 rounded-2xl bg-primary-500 text-white flex items-center justify-center text-[10px] shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform">D{{ selectedDayNumber }}</span>
             <span class="opacity-60">Status: Active</span>
             <span class="text-primary-400/80">{{ currentDayActivities.length }} Waypoints</span>
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

