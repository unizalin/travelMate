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
    alert('正在為您建立計畫...')
}
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden bg-[#050b18] text-white">
    <!-- Header (Tabs) - Optional if navigation is enough -->
    <header class="absolute top-0 left-0 w-full z-40 p-6 pointer-events-none">
        <div class="max-w-md mx-auto flex items-center justify-center pointer-events-auto">
            <div class="inline-flex p-1 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 ring-1 ring-white/5">
                <button 
                    @click="currentTab = 'explore'"
                    class="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    :class="currentTab === 'explore' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-white/40 hover:text-white'"
                >
                    環遊世界
                </button>
                <button 
                    class="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white/20 cursor-not-allowed"
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

        <!-- Coordinates Display (redundant with DartControls but can be kept for tech aesthetics) -->
        <div class="absolute top-4 right-6 text-right z-20 pointer-events-none opacity-50">
            <div class="text-[10px] font-black text-primary-400 uppercase tracking-widest leading-none">Global Sync</div>
            <div class="text-xl font-mono text-white/80 tabular-nums">
                {{ state.currentCoords.lat.toFixed(2) }}°N, {{ state.currentCoords.lon.toFixed(2) }}°W
            </div>
        </div>

        <!-- Loading Feedback -->
        <div v-if="state.isDartLaunching" class="absolute inset-0 bg-[#050b18]/60 backdrop-blur-md z-50 flex items-center justify-center">
            <div class="text-center">
                <div class="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto mb-6"></div>
                <div class="text-sm font-black uppercase tracking-widest animate-pulse">正在鎖定航點...</div>
            </div>
        </div>
      </div>

      <!-- Activity Tab (Discovery Feed) -->
      <div v-if="currentTab === 'activity'" class="w-full h-full bg-[#050b18]">
        <DiscoveryFeed />
      </div>

      <!-- Footprints Tab (Profile) -->
      <div v-if="currentTab === 'footprints'" class="w-full h-full bg-[#050b18] overflow-y-auto">
        <UserProfileFootprints />
      </div>

      <!-- Collaborate Tab (Meeting/Wishlist) -->
      <div v-if="currentTab === 'collaborate'" class="w-full h-full bg-[#050b18] overflow-y-auto p-6 pt-24">
        <div v-if="tripStore.trips.length > 0">
          <div class="mb-10 flex items-center justify-between">
            <h2 class="text-2xl font-black tracking-tighter uppercase tabular-nums">
              <span class="text-primary-400">#</span> 會議中: 願望清單
            </h2>
            <button 
              @click="router.push('/trips')"
              class="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
            >
              返回儀表板
            </button>
          </div>
          <CandidateActivitiesView 
            :trip-id="tripStore.trips[0].id"
            :trip-info="{
              destination: tripStore.trips[0].destination,
              startDate: tripStore.trips[0].start_date,
              endDate: tripStore.trips[0].end_date,
              totalDays: 0 // Will be handled inside
            }"
          />
        </div>
        <div v-else class="h-full flex flex-col items-center justify-center text-center">
            <div class="text-4xl mb-4">📫</div>
            <h3 class="text-xl font-black mb-2">尚無進行中的會議</h3>
            <p class="text-white/40 text-sm max-w-xs mx-auto mb-8">建立一個旅程來開始與成員協作景點並進行投票。</p>
            <button @click="router.push('/trips')" class="px-8 py-3 bg-primary-600 rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                前往建立旅程
            </button>
        </div>
      </div>
    </main>

    <!-- Global Bottom Nav -->
    <nav class="absolute bottom-0 left-0 w-full z-50 px-6 pb-6 pointer-events-none">
        <div class="max-w-md mx-auto pointer-events-auto">
            <div class="bg-secondary-900/40 backdrop-blur-2xl border border-white/10 p-2 rounded-[2.5rem] flex items-center justify-between shadow-2xl ring-1 ring-white/5">
                <button 
                    @click="currentTab = 'explore'"
                    class="nav-btn" 
                    :class="{ 'active': currentTab === 'explore' }"
                >
                    <GlobeAltIcon class="w-6 h-6" />
                    <span>探索</span>
                </button>
                <button 
                    @click="currentTab = 'activity'"
                    class="nav-btn"
                    :class="{ 'active': currentTab === 'activity' }"
                >
                    <PaperAirplaneIcon class="w-6 h-6 rotate-45" />
                    <span>動態</span>
                </button>
                <button 
                    @click="currentTab = 'footprints'"
                    class="nav-btn"
                    :class="{ 'active': currentTab === 'footprints' }"
                >
                    <MapIcon class="w-6 h-6" />
                    <span>足跡</span>
                </button>
                <button 
                    @click="currentTab = 'collaborate'"
                    class="nav-btn"
                    :class="{ 'active': currentTab === 'collaborate' }"
                >
                    <UserGroupIcon class="w-6 h-6" />
                    <span>協作</span>
                </button>
            </div>
        </div>
    </nav>
  </div>
</template>

<style scoped>
.nav-btn {
    @apply flex flex-col items-center gap-1.5 px-6 py-3 rounded-[2rem] text-white/30 transition-all duration-300;
}

.nav-btn span {
    @apply text-[10px] font-black uppercase tracking-widest opacity-0 -translate-y-1 transition-all;
}

.nav-btn.active {
    @apply bg-white text-secondary-900 shadow-xl scale-110;
}

.nav-btn.active span {
    @apply opacity-100 translate-y-0;
}
</style>
