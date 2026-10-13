<script setup lang="ts">
import { ref, reactive } from 'vue'
import WorldExploreGlobe from '@/components/explore/WorldExploreGlobe.vue'
import DiscoveryFeed from '@/components/explore/DiscoveryFeed.vue'
import UserProfileFootprints from '@/components/explore/UserProfileFootprints.vue'
import DartControls from '@/components/map/DartControls.vue'
import { 
  GlobeAltIcon, 
  PaperAirplaneIcon, 
  MapIcon, 
  UserGroupIcon
} from '@heroicons/vue/24/outline'

import CandidateActivitiesView from '@/views/CandidateActivitiesView.vue'
import { useRouter } from 'vue-router'
import { useTripStore } from '@/stores/trip'
import { onMounted } from 'vue'

const router = useRouter()
const tripStore = useTripStore()
const currentTab = ref('explore') // explore, activity, footprints, collaborate

onMounted(() => {
  tripStore.fetchTrips()
})

const state = reactive({
  isDartLaunching: false,
  isAutoRotating: true,
  currentCoords: { lat: 0, lon: 0 },
  detectedLocation: null as any,
  showAiInsight: false,
  aiResponse: ''
})

// Sample Destinations for Dart Game
const sampleDestinations = [
  { name: '雷克雅維克, 冰島', temp: '2°C', price: '$$$', img: 'https://images.unsplash.com/photo-1504109586057-7a2ae83d1338?q=80&w=800' },
  { name: '京都, 日本', temp: '15°C', price: '$$', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800' },
  { name: '聖托里尼, 希臘', temp: '22°C', price: '$$$$', img: 'https://images.unsplash.com/photo-1542931287-023b922fa89b?q=80&w=800' },
  { name: '開普敦, 南非', temp: '26°C', price: '$', img: 'https://images.unsplash.com/photo-1580619305218-8423a7ef79b4?q=80&w=800' }
]

const updateCoords = (lat: number, lon: number) => {
  state.currentCoords.lat = lat
  state.currentCoords.lon = lon
}

const handleLaunch = () => {
    state.isDartLaunching = true
    state.detectedLocation = null
    
    // Simulate "Launch" duration
    setTimeout(() => {
        state.isDartLaunching = false
        // Pick random destination
        const random = sampleDestinations[Math.floor(Math.random() * sampleDestinations.length)]
        state.detectedLocation = {
            ...random,
            coords: `${state.currentCoords.lat.toFixed(2)}°N, ${state.currentCoords.lon.toFixed(2)}°W`,
            highlights: 'AI 推薦：這裡的風景非常優美，適合拍照留念。'
        }
    }, 2000)
}

const handleStartPlanning = () => {
    // Navigate to create trip or add to current
    router.push('/trips')
}
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden bg-[#020617] mesh-gradient-dark text-white selection:bg-primary-500/30">
    <!-- Header (Tabs) -->
    <header class="absolute top-0 left-0 w-full z-40 p-10 pointer-events-none">
        <div class="max-w-md mx-auto flex items-center justify-center pointer-events-auto">
            <div class="inline-flex p-1.5 bg-secondary-900/40 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-2xl ring-1 ring-white/5">
                <button 
                    @click="currentTab = 'explore'"
                    class="px-8 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500"
                    :class="currentTab === 'explore' ? 'bg-white text-secondary-900 shadow-xl' : 'text-white/40 hover:text-white'"
                >
                    環遊世界
                </button>
                <button 
                    class="px-8 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] text-white/10 cursor-not-allowed"
                >
                    國內探索
                </button>
            </div>
        </div>
    </header>

    <!-- Content Area -->
    <main class="w-full h-full">
      <!-- Explore Tab (3D Globe + Dart Controls) -->
      <div v-show="currentTab === 'explore'" class="w-full h-full relative">
        <WorldExploreGlobe 
          @dart-land="handleLaunch" 
          @update-coords="updateCoords" 
        />
        
        <!-- UI Overlay for Globe (Dart Controls) -->
        <div class="absolute inset-0 z-10 pointer-events-none">
          <DartControls 
            class="pointer-events-auto"
            :lat="state.currentCoords.lat"
            :lon="state.currentCoords.lon"
            :destination="state.detectedLocation"
            :is-spinning="state.isDartLaunching"
            :is-auto-rotating="state.isAutoRotating"
            @launch="handleLaunch"
            @reset="state.detectedLocation = null"
            @toggle-rotate="state.isAutoRotating = !state.isAutoRotating"
            @ai-plan="handleStartPlanning"
          />
        </div>

        <!-- Coordinates Display -->
        <div class="absolute top-10 right-10 text-right z-20 pointer-events-none group">
            <div class="text-[10px] font-black text-primary-400 uppercase tracking-[0.4em] mb-2 opacity-50 group-hover:opacity-100 transition-opacity">Orbital Sync</div>
            <div class="text-3xl font-mono text-white/90 tabular-nums drop-shadow-2xl font-light">
                <span class="text-white/40 font-bold mr-1">LAT</span>{{ state.currentCoords.lat.toFixed(3) }}<span class="text-white/20 mx-2">|</span><span class="text-white/40 font-bold mr-1">LON</span>{{ state.currentCoords.lon.toFixed(3) }}
            </div>
        </div>

        <!-- Loading Feedback -->
        <div v-if="state.isDartLaunching" class="absolute inset-0 bg-[#020617]/80 backdrop-blur-2xl z-50 flex items-center justify-center animate-fade-in shadow-inner">
            <div class="text-center group">
                <div class="relative w-24 h-24 mx-auto mb-10">
                    <div class="absolute inset-0 border-4 border-primary-500/10 rounded-full"></div>
                    <div class="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <div class="absolute inset-4 border-2 border-primary-500/20 border-b-transparent rounded-full animate-spin-slow"></div>
                </div>
                <div class="text-xs font-black uppercase tracking-[0.5em] animate-pulse text-primary-400">正在鎖定航點軌道...</div>
            </div>
        </div>
      </div>

      <!-- Activity Tab (Discovery Feed) -->
      <div v-if="currentTab === 'activity'" class="w-full h-full bg-[#020617] mesh-gradient-dark">
        <DiscoveryFeed />
      </div>

      <!-- Footprints Tab (Profile) -->
      <div v-if="currentTab === 'footprints'" class="w-full h-full bg-[#020617] mesh-gradient-dark overflow-y-auto">
        <UserProfileFootprints />
      </div>

      <!-- Collaborate Tab (Meeting/Wishlist) -->
      <div v-if="currentTab === 'collaborate'" class="w-full h-full bg-[#020617] mesh-gradient-dark overflow-y-auto p-10 pt-32">
        <div v-if="tripStore.trips.length > 0">
          <div class="mb-12 flex items-center justify-between">
            <h2 class="text-3xl font-black tracking-tighter uppercase tabular-nums">
              <span class="text-primary-400 animate-pulse">#</span> Mission Hub: <span class="text-white/60">Wishlist</span>
            </h2>
            <button 
              @click="router.push('/trips')"
              class="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all active:scale-95 shadow-2xl"
            >
              Back to Dashboard
            </button>
          </div>
          <CandidateActivitiesView 
            :trip-id="tripStore.trips[0].id"
            :trip-info="{
              destination: tripStore.trips[0].destination,
              startDate: tripStore.trips[0].start_date,
              endDate: tripStore.trips[0].end_date,
              totalDays: 0 
            }"
          />
        </div>
        <div v-else class="h-full flex flex-col items-center justify-center text-center">
            <div class="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-5xl mb-10 shadow-inner">📫</div>
            <h3 class="text-2xl font-black mb-4 tracking-tight">尚無進行中的會議</h3>
            <p class="text-white/40 text-base max-w-xs mx-auto mb-12 font-medium">建立一個旅程來開始與成員協作景點並進行投票。</p>
            <button @click="router.push('/trips')" class="btn-primary px-12 py-5 text-xs font-black uppercase tracking-[0.3em]">
                前往建立旅程
            </button>
        </div>
      </div>
    </main>

    <!-- Global Bottom Nav -->
    <nav class="absolute bottom-0 left-0 w-full z-50 px-10 pb-10 pointer-events-none animate-fade-in-up [animation-delay:800ms]">
        <div class="max-w-lg mx-auto pointer-events-auto">
            <div class="bg-secondary-900/40 backdrop-blur-3xl border border-white/10 p-2.5 rounded-[3rem] flex items-center justify-between shadow-[0_50px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
                <button 
                    @click="currentTab = 'explore'"
                    class="nav-btn group" 
                    :class="{ 'active': currentTab === 'explore' }"
                >
                    <GlobeAltIcon class="w-6 h-6 group-active:scale-90 transition-transform" />
                    <span>Explore</span>
                </button>
                <button 
                    @click="currentTab = 'activity'"
                    class="nav-btn group"
                    :class="{ 'active': currentTab === 'activity' }"
                >
                    <PaperAirplaneIcon class="w-6 h-6 rotate-45 group-active:scale-90 transition-transform" />
                    <span>Feeds</span>
                </button>
                <button 
                    @click="currentTab = 'footprints'"
                    class="nav-btn group"
                    :class="{ 'active': currentTab === 'footprints' }"
                >
                    <MapIcon class="w-6 h-6 group-active:scale-90 transition-transform" />
                    <span>Points</span>
                </button>
                <button 
                    @click="currentTab = 'collaborate'"
                    class="nav-btn group"
                    :class="{ 'active': currentTab === 'collaborate' }"
                >
                    <UserGroupIcon class="w-6 h-6 group-active:scale-90 transition-transform" />
                    <span>Collab</span>
                </button>
            </div>
        </div>
    </nav>
  </div>
</template>

<style scoped>
.nav-btn {
    @apply flex flex-col items-center gap-2 px-8 py-4 rounded-[2.5rem] text-white/30 transition-all duration-500 cursor-pointer;
}

.nav-btn span {
    @apply text-[9px] font-black uppercase tracking-[0.2em] opacity-0 -translate-y-2 transition-all duration-500;
}

.nav-btn.active {
    @apply bg-white text-secondary-950 shadow-[0_15px_30px_rgba(255,255,255,0.2)] scale-110;
}

.nav-btn.active span {
    @apply opacity-100 translate-y-0.5;
}

.animate-spin-slow {
    animation: spin 3s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
</style>
