<template>
  <div class="min-h-screen bg-[#020617] mesh-gradient-dark text-white selection:bg-primary-500/30 font-sans transition-all duration-500">
    <!-- Orbital Decor -->
    <div class="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#3b82f633_0%,transparent_50%)]"></div>
        <div class="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]"></div>
    </div>

    <!-- Glass Header -->
    <header class="sticky top-0 z-50 p-6 md:p-10">
        <div class="mx-auto max-w-7xl">
            <div class="bg-secondary-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] px-8 py-5 flex justify-between items-center shadow-2xl ring-1 ring-white/5 transition-all">
                <div class="flex items-center gap-6">
                    <router-link to="/" class="flex items-center gap-4 group active:scale-95 transition-transform">
                        <div class="p-3 bg-primary-600 rounded-2xl shadow-2xl shadow-primary-600/30 group-hover:rotate-12 transition-transform">
                            <img src="@/assets/img/TravelMate.png" alt="TravelMate" class="h-6 w-auto brightness-0 invert" />
                        </div>
                        <span class="text-2xl font-black tracking-tighter hidden sm:block text-white group-hover:text-primary-400 transition-colors">CENTRAL HUB</span>
                    </router-link>
                </div>

                <div class="flex items-center gap-6">
                    <button @click="isJoinModalOpen = true"
                        class="hidden sm:flex items-center gap-3 px-6 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-[0.3em] transition-all text-white/50 hover:text-white">
                        <UserGroupIcon class="w-4 h-4" />
                        Join Team
                    </button>
                    
                    <button @click="isCreateModalOpen = true"
                        class="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white text-secondary-900 shadow-2xl hover:bg-primary-400 hover:text-white hover:-translate-y-1 active:translate-y-0 text-[10px] font-black uppercase tracking-[0.3em] transition-all">
                        <PlusIcon class="w-4 h-4" />
                        <span>Deploy Mission</span>
                    </button>
                    
                    <div class="h-6 w-[1px] bg-white/10 hidden sm:block"></div>
                    
                    <UserMenu class="text-white" />
                </div>
            </div>
        </div>
    </header>

    <main class="relative z-10 pb-24">
      <div class="mx-auto max-w-7xl px-8 md:px-12 lg:px-16">
        
        <!-- Welcome Section -->
        <div class="mb-20 animate-fade-in-up">
            <div class="flex items-center gap-4 mb-6">
                <div class="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse"></div>
                <span class="text-[10px] font-black uppercase tracking-[0.8em] text-primary-400">Mission Operational Status: Active</span>
            </div>
            <h1 class="text-6xl md:text-8xl font-black tracking-tighter mb-8 text-white uppercase tabular-nums">
                My <span class="text-primary-500">Missions</span>
            </h1>
            <p class="text-white/30 font-bold max-w-xl text-lg leading-relaxed">
                Coordinate your global surface objectives. Manage active deployments or initialize new explorations from this centralized command node.
            </p>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-60 gap-8">
            <div class="relative w-24 h-24">
                <div class="absolute inset-0 border-4 border-primary-500/10 rounded-full"></div>
                <div class="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <div class="absolute inset-4 border-4 border-primary-400/20 border-b-transparent rounded-full animate-spin-reverse"></div>
            </div>
            <div class="text-[10px] font-black uppercase tracking-[1em] text-primary-400/50 animate-pulse">Decrypting Mission Data...</div>
        </div>

        <div v-else-if="error" class="max-w-xl mx-auto text-center py-24 rounded-[4rem] bg-secondary-900/40 border border-white/10 p-16 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5 animate-fade-in">
           <div class="mx-auto w-24 h-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center mb-10 text-rose-500 shadow-inner group transition-colors ring-1 ring-rose-500/20">
              <ExclamationTriangleIcon class="w-12 h-12 group-hover:scale-110 transition-transform" />
           </div>
           <h3 class="text-3xl font-black mb-4 text-white uppercase tracking-tighter leading-none">Transmission Failed</h3>
           <p class="text-white/30 text-sm mb-12 leading-relaxed font-bold px-8">{{ error }}</p>
           <button 
                @click="tripStore.fetchTrips()"
                class="w-full py-5 rounded-3xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-rose-600 transition-all active:scale-95"
           >
              Retry Connection
           </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="trips.length === 0" class="flex flex-col items-center justify-center py-40 bg-secondary-900/20 rounded-[5rem] border-2 border-dashed border-white/5 text-center backdrop-blur-3xl animate-fade-in ring-1 ring-white/5">
            <div class="w-40 h-40 bg-white/5 rounded-[3rem] flex items-center justify-center mb-12 shadow-2xl border border-white/10 relative group transition-all hover:bg-white/10 overflow-hidden">
               <span class="text-7xl group-hover:scale-125 transition-transform">🚀</span>
               <div class="absolute inset-0 bg-primary-500/10 blur-[100px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <h3 class="text-4xl font-black mb-6 text-white tracking-tighter uppercase leading-none">Vacant Surface Radar</h3>
            <p class="text-white/30 max-w-sm mx-auto mb-14 text-sm leading-relaxed font-bold tracking-tight px-6">
                No active missions detected on current trajectory. Ready to deploy the first expedition team?
            </p>
            <button @click="isCreateModalOpen = true"
                class="px-16 py-6 bg-primary-600 rounded-[3rem] text-[10px] font-black uppercase tracking-[0.5em] hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-primary-600/30 text-white border border-primary-400/50">
                Initialize First Mission
            </button>
        </div>

        <!-- Trip Grid -->
        <div v-else ref="tripsListRef" class="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <TripCard v-for="trip in trips" :key="trip.id" :trip="trip" />
          
          <!-- Create New Task Card -->
          <button @click="isCreateModalOpen = true" 
            class="group relative flex flex-col items-center justify-center min-h-[400px] rounded-[3.5rem] border-2 border-dashed border-white/5 bg-secondary-900/20 backdrop-blur-3xl hover:border-primary-500/50 hover:bg-secondary-900/40 transition-all duration-700 ring-1 ring-white/5">
             <div class="w-20 h-20 rounded-[2rem] bg-white/5 group-hover:bg-primary-600 flex items-center justify-center mb-6 transition-all duration-700 shadow-2xl border border-white/5">
                <PlusIcon class="w-10 h-10 text-white/20 group-hover:text-white group-hover:scale-110 transition-all duration-700" />
             </div>
             <span class="text-[10px] font-black text-white/20 group-hover:text-white uppercase tracking-[0.5em] transition-colors">Establish New Directive</span>
             
             <!-- Signal Indicator -->
             <div class="absolute top-8 right-8 w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-primary-500 animate-pulse transition-colors"></div>
          </button>
        </div>
      </div>
    </main>

    <CreateTripModal :is-open="isCreateModalOpen" @close="isCreateModalOpen = false" @success="handleTripCreated" />
    <JoinTripModal :is-open="isJoinModalOpen" @close="isJoinModalOpen = false" @success="handleTripCreated" />
  </div>
</template>

<script setup lang="ts">
import CreateTripModal from '@/components/modals/CreateTripModal.vue'
import JoinTripModal from '@/components/modals/JoinTripModal.vue'
import TripCard from '@/components/trip/TripCard.vue'
import UserMenu from '@/components/common/UserMenu.vue'
import { useTripStore } from '@/stores/trip'
import { storeToRefs } from 'pinia'
import { onMounted, ref, watch } from 'vue'
import { PlusIcon, UserGroupIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import gsap from 'gsap'

const tripStore = useTripStore()
const { trips, loading, error } = storeToRefs(tripStore)
const isCreateModalOpen = ref(false)
const isJoinModalOpen = ref(false)
const tripsListRef = ref<HTMLElement | null>(null)

onMounted(async () => {
  await tripStore.fetchTrips()
  
  if (tripsListRef.value && trips.value.length > 0) {
    gsap.from(tripsListRef.value.children, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power4.out",
      clearProps: "all"
    })
  }
})

watch(() => trips.value, (newTrips) => {
    if (newTrips.length > 0 && tripsListRef.value) {
        // Use nextTick if needed, but watch usually triggers after DOM update in Vue 3 for refs in templates
        setTimeout(() => {
            if (tripsListRef.value) {
                gsap.from(tripsListRef.value.children, {
                    y: 20,
                    opacity: 0,
                    duration: 0.6,
                    stagger: 0.08,
                    ease: "power3.out",
                    clearProps: "all"
                })
            }
        }, 50)
    }
})

function handleTripCreated(_id: string) {
  tripStore.fetchTrips() // Refresh list
}

</script>
