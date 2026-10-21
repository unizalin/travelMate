<script setup lang="ts">
import { useItineraryStore } from '@/stores/itinerary';
import { useTripStore } from '@/stores/trip';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MapView from '@/components/map/MapView.vue';

const route = useRoute();
const router = useRouter();
const tripStore = useTripStore();
const itineraryStore = useItineraryStore();
const { currentTrip, loading, error } = storeToRefs(tripStore);

const tripId = route.params.tripId as string;
const selectedDay = ref(1);

onMounted(async () => {
  await tripStore.fetchTripById(tripId);
  // Do NOT pass start_date/end_date to avoid triggering ensureItineraries (database write)
  // Public viewers don't have write access, and this view is for existing itineraries only.
  await itineraryStore.fetchItineraries(tripId);
});

const currentItinerary = ref<any>(null);
const currentActivities = ref<any[]>([]);

const selectDay = (day: number) => {
  selectedDay.value = day;
  const itinerary = itineraryStore.itineraries.find(i => i.day_number === day);
  currentItinerary.value = itinerary;
  currentActivities.value = itinerary?.activities || [];
};

watch(() => itineraryStore.itineraries, (newItineraries) => {
  if (newItineraries.length > 0 && !currentItinerary.value) {
    selectDay(1);
  }
}, { deep: true });

import { watch } from 'vue';
</script>

<template>
  <div class="min-h-screen bg-[#020617] mesh-gradient-dark text-white selection:bg-primary-500/30 font-sans pb-24">
    <!-- Navbar (Simplified) -->
    <nav class="sticky top-0 z-50 bg-secondary-900/40 backdrop-blur-3xl border-b border-white/10 shadow-2xl ring-1 ring-white/5">
      <div class="mx-auto max-w-7xl px-8">
        <div class="flex h-20 justify-between items-center">
          <div class="flex items-center gap-4 group">
            <span class="text-2xl font-black tracking-tighter text-white group-hover:text-primary-400 transition-colors">TravelMate</span>
            <div class="h-4 w-[1px] bg-white/10"></div>
            <div class="flex flex-col">
              <span class="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Shared Mission</span>
              <span class="text-[8px] font-black text-primary-500 uppercase tracking-[0.1em]">Protocol Active</span>
            </div>
          </div>
          <button
            @click="router.push('/login')"
            class="px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
          >
            Create Your Own
          </button>
        </div>
      </div>
    </nav>

    <div v-if="loading || itineraryStore.loading" class="flex flex-col items-center justify-center py-40 gap-6">
      <div class="relative w-16 h-16">
        <div class="absolute inset-0 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin"></div>
        <div class="absolute inset-2 rounded-full border-2 border-primary-400/10 border-b-primary-400 animate-spin-reverse"></div>
      </div>
      <div class="text-[10px] font-black uppercase tracking-[0.5em] text-primary-400 animate-pulse">Establishing Connection...</div>
    </div>

    <div v-else-if="error || itineraryStore.error" class="flex flex-col items-center justify-center py-40 px-8 text-center animate-fade-in">
      <div class="bg-secondary-900/40 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-white/10 shadow-2xl max-w-xl ring-1 ring-white/5">
        <span class="text-6xl mb-8 block grayscale group-hover:grayscale-0 transition-all duration-700">🚫</span>
        <h2 class="text-3xl font-black text-white tracking-tighter uppercase mb-4">Transmission Failed</h2>
        <p class="text-white/40 mb-10 text-sm font-medium leading-relaxed">{{ error || itineraryStore.error || 'The sharing link has expired or access has been restricted by the owner.' }}</p>
        <button
          @click="router.push('/')"
          class="inline-flex items-center gap-3 bg-white text-secondary-900 px-10 py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-primary-400 hover:text-white hover:-translate-y-1 transition-all"
        >
          Return to Command
        </button>
      </div>
    </div>

    <div v-else-if="currentTrip" class="mx-auto max-w-7xl px-8 pt-12 animate-fade-in">
      <!-- Header -->
      <div class="bg-secondary-900/40 backdrop-blur-3xl rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden mb-12 ring-1 ring-white/5">
        <div class="p-10 md:p-14">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <span class="px-4 py-1.5 bg-primary-500/10 text-primary-400 text-[9px] font-black rounded-xl border border-primary-500/20 uppercase tracking-widest">Read Only Mode</span>
                <span class="text-white/10">•</span>
                <span class="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">External Intelligence Feed</span>
              </div>
              <h1 class="text-5xl font-black text-white tracking-tighter uppercase tabular-nums">{{ currentTrip.name }}</h1>
              <div class="flex flex-wrap items-center gap-8 pt-2">
                <div class="flex flex-col">
                  <span class="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Target Zone</span>
                  <span class="text-sm font-bold flex items-center gap-2">
                     <span class="text-lg opacity-50">📍</span> {{ currentTrip.destination }}
                  </span>
                </div>
                <div class="flex flex-col">
                  <span class="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Mission Window</span>
                  <span class="text-sm font-bold flex items-center gap-2">
                     <span class="text-lg opacity-50">📅</span> {{ currentTrip.start_date }} — {{ currentTrip.end_date }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Day Selector Tabs -->
        <div class="px-10 border-t border-white/5 flex overflow-x-auto no-scrollbar gap-4 py-8 bg-white/5">
          <button
            v-for="i in itineraryStore.itineraries.length"
            :key="i"
            @click="selectDay(i)"
            :class="[
              'flex-shrink-0 px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 border',
              selectedDay === i 
                ? 'bg-white text-secondary-900 shadow-2xl border-white scale-105 z-10' 
                : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/10'
            ]"
          >
            Phase {{ String(i).padStart(2, '0') }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div class="lg:col-span-12">
          <div class="bg-secondary-900/40 backdrop-blur-3xl rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden min-h-[600px] flex flex-col md:flex-row ring-1 ring-white/5">
            
            <!-- Map Section -->
            <div class="h-[400px] md:h-auto md:w-5/12 lg:w-1/2 relative order-1 md:order-2 bg-secondary-900/40 group overflow-hidden">
                <div class="absolute inset-0 z-0 opacity-40 group-hover:opacity-60 transition-opacity duration-1000">
                    <MapView :activities="currentActivities" />
                </div>
                <!-- Glass Overlay for Map Controls -->
                <div class="absolute top-6 right-6 z-10">
                    <div class="p-2 bg-secondary-900/60 backdrop-blur-xl rounded-2xl border border-white/10">
                        <div class="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                    </div>
                </div>
            </div>

            <!-- Itinerary List Section -->
            <div class="flex-1 p-10 md:p-14 order-2 md:order-1 overflow-y-auto max-h-[800px] no-scrollbar">
              <div v-if="currentActivities.length > 0" class="space-y-12">
                <div v-for="(activity, index) in currentActivities" :key="activity.id" class="group relative pl-16">
                  <!-- Timeline architecture -->
                  <div v-if="index < currentActivities.length - 1" class="absolute left-6 top-14 bottom-[-48px] w-[2px] bg-gradient-to-b from-primary-500/30 to-transparent"></div>
                  
                  <!-- Sequence Indicator -->
                  <div class="absolute left-0 top-0 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/40 group-hover:bg-primary-500 group-hover:text-white group-hover:border-primary-400 group-hover:scale-110 flex items-center justify-center font-black text-xs transition-all duration-500 shadow-2xl">
                    {{ String(index + 1).padStart(2, '0') }}
                  </div>

                  <div class="space-y-4">
                    <div class="flex justify-between items-start">
                      <div class="space-y-1">
                        <h3 class="text-2xl font-black text-white tracking-tight uppercase group-hover:text-primary-400 transition-colors">{{ activity.name }}</h3>
                        <p v-if="activity.location" class="text-[10px] text-white/30 font-black uppercase tracking-widest flex items-center gap-2">
                           <span class="opacity-50">📍</span> {{ activity.location }}
                        </p>
                      </div>
                      <span v-if="activity.start_time" class="text-[11px] font-black tabular-nums text-primary-400 bg-primary-500/10 border border-primary-500/20 px-4 py-2 rounded-xl group-hover:bg-primary-500 group-hover:text-white transition-all shadow-lg">
                        {{ activity.start_time.substring(0, 5) }}
                      </span>
                    </div>
                    
                    <div v-if="activity.notes" class="group/note relative bg-white/5 hover:bg-white/[0.08] p-6 rounded-[2rem] border border-white/5 transition-all duration-500">
                        <div class="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500/30 rounded-full group-hover/note:bg-primary-500 transition-colors"></div>
                        <p class="text-sm text-white/50 leading-relaxed font-medium">
                            {{ activity.notes }}
                        </p>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="h-full flex flex-col items-center justify-center text-center space-y-6 py-20 animate-fade-in">
                <div class="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-5xl grayscale opacity-20">💤</div>
                <div class="space-y-2">
                    <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.5em]">No Objectives Identified</h4>
                    <p class="text-[9px] font-black text-white/10 uppercase tracking-widest italic">The itinerary for this phase is currently empty.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none opacity-20">
        <p class="text-[8px] font-black text-white uppercase tracking-[1em]">TravelMate External Viewer Layer</p>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.animate-spin-reverse {
    animation: spin-reverse 1.5s linear infinite;
}

@keyframes spin-reverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
}

.animate-fade-in {
    animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
