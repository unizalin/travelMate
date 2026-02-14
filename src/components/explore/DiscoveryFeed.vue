<script setup lang="ts">
import { ref } from 'vue'
import { MapIcon, HeartIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const publicTrips = ref([
  {
    id: '1',
    name: '我的東京購物之旅',
    destination: '東京, 日本',
    trip_stats: { days: 5, attractions: 12, distance: 45 },
    creator_name: 'Alice',
    is_liked: false,
    image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=800'
  },
  {
    id: '2',
    name: '冰島環島冒險',
    destination: '雷克雅維克, 冰島',
    trip_stats: { days: 7, attractions: 24, distance: 1200 },
    creator_name: 'Bob',
    is_liked: true,
    image_url: 'https://images.unsplash.com/photo-1517522511674-80c0587fd597?q=80&w=800'
  }
])

const toggleLike = (trip: any) => {
  trip.is_liked = !trip.is_liked
}
</script>

<template>
  <div class="p-6 pb-32 space-y-6 overflow-y-auto h-full max-w-2xl mx-auto">
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-2xl font-black text-white tracking-tight">探索靈感</h2>
      <div class="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 font-medium">
        Traveler Footprints
      </div>
    </div>

    <div v-for="trip in publicTrips" :key="trip.id" class="group relative bg-[#0a192f]/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-primary-500/50 transition-all duration-500">
      <!-- Image & Route Preview -->
      <div class="relative h-64 overflow-hidden">
        <img :src="trip.image_url" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div class="absolute inset-0 bg-gradient-to-t from-[#0a192f] via-transparent to-transparent"></div>
        
        <!-- Route Overlay Mock -->
        <div class="absolute bottom-4 left-6 flex items-center gap-4">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/90 text-white text-[10px] font-black uppercase tracking-wider">
                <MapIcon class="w-3 h-3" />
                Route Tracked
            </div>
            <div class="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider">
                {{ trip.trip_stats.days }} Days
            </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-8">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h3 class="text-xl font-black text-white mb-1">{{ trip.name }}</h3>
            <p class="text-white/40 text-sm font-medium">{{ trip.destination }} • @{{ trip.creator_name }}</p>
          </div>
          <button @click="toggleLike(trip)" class="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <HeartIcon class="w-6 h-6" :class="trip.is_liked ? 'text-rose-500 fill-rose-500' : 'text-white/40'" />
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-8">
            <div class="p-4 rounded-3xl bg-white/5 border border-white/5">
                <div class="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-1">Attractions</div>
                <div class="text-xl font-black text-white">{{ trip.trip_stats.attractions }} <span class="text-xs text-white/40">點</span></div>
            </div>
            <div class="p-4 rounded-3xl bg-white/5 border border-white/5">
                <div class="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Distance</div>
                <div class="text-xl font-black text-white">{{ trip.trip_stats.distance }} <span class="text-xs text-white/40">KM</span></div>
            </div>
        </div>

        <button class="w-full py-5 bg-white text-secondary-900 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5">
          <ArrowPathIcon class="w-5 h-5" />
          Clone Itinerary
          <span class="text-[10px] bg-secondary-100 px-2 py-0.5 rounded ml-2">FREE</span>
        </button>
      </div>
    </div>
  </div>
</template>
