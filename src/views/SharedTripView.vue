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
  if (currentTrip.value) {
    await itineraryStore.fetchItineraries(tripId, currentTrip.value.start_date, currentTrip.value.end_date);
  }
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
  <div class="min-h-screen bg-gray-50 pb-12">
    <!-- Navbar (Simplified) -->
    <nav class="bg-white shadow">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="text-xl font-bold text-blue-600">TravelMate</span>
            <span class="text-gray-300">|</span>
            <span class="text-sm text-gray-500">共享行程</span>
          </div>
          <button
            @click="router.push('/login')"
            class="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            我也要規劃旅程
          </button>
        </div>
      </div>
    </nav>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div class="bg-red-50 p-6 rounded-2xl max-w-md">
        <span class="text-4xl mb-4 block">🚫</span>
        <h2 class="text-xl font-bold text-gray-900 mb-2">抱歉，找不到此行程</h2>
        <p class="text-gray-600 mb-6">可能連結已失效，或您沒有存取權限。</p>
        <button
          @click="router.push('/')"
          class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-500 transition-all"
        >
          回首頁
        </button>
      </div>
    </div>

    <div v-else-if="currentTrip" class="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="bg-white rounded-3xl shadow-sm overflow-hidden mb-8">
        <div class="p-6 sm:p-8">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">共享視圖</span>
                <span class="text-gray-300">•</span>
                <span class="text-sm text-gray-500">來自 {{ currentTrip.profiles?.display_name || '好友' }} 的分享</span>
              </div>
              <h1 class="text-3xl font-bold text-gray-900">{{ currentTrip.name }}</h1>
              <div class="mt-3 flex flex-wrap items-center gap-4 text-gray-600">
                <span class="flex items-center gap-1.5"><span class="text-xl">📍</span> {{ currentTrip.destination }}</span>
                <span class="flex items-center gap-1.5"><span class="text-xl">📅</span> {{ currentTrip.start_date }} - {{ currentTrip.end_date }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Day Selector Tabs -->
        <div class="px-6 border-t border-gray-100 flex overflow-x-auto no-scrollbar gap-2 py-4">
          <button
            v-for="i in itineraryStore.itineraries.length"
            :key="i"
            @click="selectDay(i)"
            :class="[
              'flex-shrink-0 px-6 py-2 rounded-full text-sm font-bold transition-all',
              selectedDay === i ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            ]"
          >
            第 {{ i }} 天
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- List Side -->
        <div class="lg:col-span-12">
          <div class="bg-white rounded-3xl shadow-sm overflow-hidden min-h-[500px] flex flex-col md:flex-row">
            
            <!-- Map (on top for mobile, right for desktop) -->
            <div class="h-[300px] md:h-auto md:w-5/12 lg:w-1/2 relative order-1 md:order-2 border-b md:border-b-0 md:border-l border-gray-100">
              <MapView :activities="currentActivities" />
            </div>

            <!-- List (bottom for mobile, left for desktop) -->
            <div class="flex-1 p-6 sm:p-8 order-2 md:order-1 overflow-y-auto">
              <div v-if="currentActivities.length > 0" class="space-y-8">
                <div v-for="(activity, index) in currentActivities" :key="activity.id" class="relative pl-12">
                  <!-- Timeline line -->
                  <div v-if="index < currentActivities.length - 1" class="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-100"></div>
                  
                  <!-- Circle index -->
                  <div class="absolute left-0 top-0 w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                    {{ index + 1 }}
                  </div>

                  <div>
                    <div class="flex justify-between items-start mb-1">
                      <h3 class="font-bold text-gray-900 text-lg">{{ activity.name }}</h3>
                      <span v-if="activity.start_time" class="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {{ activity.start_time.substring(0, 5) }}
                      </span>
                    </div>
                    <p v-if="activity.location" class="text-sm text-gray-500 flex items-center gap-1 mb-2">
                       <span>📍</span> {{ activity.location }}
                    </p>
                    <p v-if="activity.notes" class="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                      {{ activity.notes }}
                    </p>
                  </div>
                </div>
              </div>
              <div v-else class="h-full flex flex-col items-center justify-center text-center text-gray-400 py-12">
                <span class="text-4xl mb-4">💤</span>
                <p>這一天目前沒有安排行程</p>
              </div>
            </div>
          </div>
        </div>
      </div>
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
</style>
