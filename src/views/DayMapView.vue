<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-[#020617] mesh-gradient-dark text-white selection:bg-primary-500/30 font-sans"
       @touchstart="handleTouchStart"
       @touchend="handleTouchEnd">
      <!-- Map Area (Top) -->
      <div class="h-[40vh] relative flex-shrink-0 animate-fade-in shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20">
          <TripMapView
            v-if="dayActivities.length > 0"
            :activities="dayActivities"
            :show-route="true"
            :origin="originCoords"
            @marker-click="scrollToActivity"
          />
           <div v-else class="h-full w-full bg-secondary-900/40 backdrop-blur-3xl flex items-center justify-center text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">
               Initialize Orbital Mapping System...
           </div>

          <!-- Back Button -->
          <button @click="$router.push(`/trips/${tripId}`)" class="absolute top-6 left-6 z-30 bg-secondary-900/40 backdrop-blur-3xl p-3 rounded-2xl shadow-2xl border border-white/10 text-white/70 hover:text-white transition-all active:scale-90 ring-1 ring-white/5">
             <ChevronLeftIcon class="w-6 h-6" />
          </button>
          
           <!-- Map Controls -->
          <div class="absolute top-6 right-6 z-30 flex flex-col gap-3">
              <button class="bg-secondary-900/40 backdrop-blur-3xl px-6 py-2.5 rounded-2xl shadow-2xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95 ring-1 ring-white/5" @click="scrollToActivity(dayActivities[0]?.id)">
                  Sequence View
              </button>
             <button class="bg-secondary-900/40 backdrop-blur-3xl px-6 py-2.5 rounded-2xl shadow-2xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95 ring-1 ring-white/5">
                  Expand Map
              </button>
          </div>
      </div>

       <!-- Day Controls / Header -->
       <div class="bg-secondary-900/40 backdrop-blur-3xl px-8 py-5 border-b border-white/5 flex items-center justify-between shrink-0 z-10 shadow-xl ring-1 ring-white/5">
           <div class="flex items-center gap-5">
               <button @click="$router.push(`/trips/${tripId}`)" class="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-90 text-white/40">
                    <ChevronLeftIcon class="w-5 h-5" />
               </button>
               <div>
                   <div class="flex items-center gap-3">
                       <h2 class="font-black text-white text-2xl tracking-tight uppercase tabular-nums">Day {{ dayNumber }}</h2>
                       <span class="text-[10px] font-black text-primary-400 bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full uppercase tracking-widest">{{ currentDateFormatted }}</span>
                   </div>
                   <p class="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mt-1">{{ dayActivities.length }} Target Waypoints</p>
               </div>
           </div>
           
           <button @click="isAIOpen = true" class="flex items-center gap-2 bg-primary-500 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.26em] hover:bg-primary-600 shadow-xl shadow-primary-500/20 active:scale-95 transition-all">
               <PlusIcon class="w-4 h-4" />
               Manual Entry
           </button>
       </div>

      <!-- Activities List (Bottom, Scrollable) -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4 relative scroll-smooth" ref="listContainer">
          <div v-if="dayActivities.length === 0" class="flex flex-col items-center justify-center text-center py-20 animate-fade-in">
              <div class="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner">🗺️</div>
              <h3 class="text-xl font-black mb-2 uppercase tracking-tight">Mission Log Empty</h3>
              <p class="text-white/30 text-xs max-w-xs mx-auto mb-8 font-medium leading-relaxed">No itineraries detected for this sector. Deploy the AI assistant to populate the schedule.</p>
              <button @click="isAIOpen = true" class="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                  Initialize Pilot System
              </button>
          </div>
          
          <ActivityCard
             v-for="(activity, index) in dayActivities"
             :key="activity.id"
             :id="'activity-' + activity.id"
             :activity="activity"
             :index="(index as number) + 1"
             class="animate-fade-in-up [animation-delay:calc(index*100ms)]"
          />
      </div>

      <!-- AI Assistant Button -->
      <button 
        @click="isAIOpen = true"
        class="absolute bottom-10 right-10 w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-all z-30 group"
      >
        <SparklesIcon class="w-8 h-8 group-hover:rotate-12 transition-transform" />
      </button>

      <!-- AI Assistant Overlay -->
      <AIAssistant
        :is-open="isAIOpen"
        :trip-id="tripId"
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
