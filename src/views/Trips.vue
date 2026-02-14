<template>
  <div class="min-h-screen bg-[#050b18] text-white selection:bg-primary-500/30">
    <!-- Premium Grid Background -->
    <div class="fixed inset-0 pointer-events-none opacity-20">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#3b82f633_0%,transparent_50%)]"></div>
        <div class="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
    </div>

    <!-- Glass Header -->
    <header class="sticky top-0 z-50 p-6">
        <div class="mx-auto max-w-7xl">
            <div class="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] px-6 py-3 flex justify-between items-center shadow-2xl ring-1 ring-white/5">
                <div class="flex items-center gap-4">
                    <router-link to="/" class="flex items-center gap-3 active:scale-95 transition-transform">
                        <div class="p-2 bg-primary-600 rounded-xl shadow-lg shadow-primary-600/20">
                            <img src="@/assets/img/TravelMate.png" alt="TravelMate" class="h-6 w-auto brightness-0 invert" />
                        </div>
                        <span class="text-xl font-black tracking-tighter hidden sm:block">TRAVELMATE</span>
                    </router-link>
                </div>

                <div class="flex items-center gap-4">
                    <button @click="isJoinModalOpen = true"
                        class="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-black uppercase tracking-widest transition-all">
                        <UserGroupIcon class="w-4 h-4" />
                        加入
                    </button>
                    
                    <button @click="isCreateModalOpen = true"
                        class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-secondary-900 shadow-xl shadow-white/10 hover:scale-105 active:scale-95 text-xs font-black uppercase tracking-widest transition-all">
                        <PlusIcon class="w-4 h-4" />
                        <span>建立旅程</span>
                    </button>
                    
                    <div class="h-6 w-px bg-white/10 hidden sm:block"></div>
                    
                    <UserMenu class="text-white" />
                </div>
            </div>
        </div>
    </header>

    <main class="relative z-10 py-12">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        
        <!-- Welcome Section -->
        <div class="mb-16">
            <div class="flex items-center gap-3 mb-4">
                <div class="h-px w-12 bg-primary-500/50"></div>
                <span class="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400">Mission Hub</span>
            </div>
            <h1 class="text-5xl font-black tracking-tighter mb-4">
                我的<span class="text-primary-500">旅程</span>
            </h1>
            <p class="text-white/40 font-medium max-w-lg">
                管理您的全球足跡。從這裡開始規劃您的下一段冒險，或是查看即將到來的精彩行程。
            </p>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32">
            <div class="relative w-20 h-20">
                <div class="absolute inset-0 border-4 border-primary-500/10 rounded-full"></div>
                <div class="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p class="mt-8 text-xs font-black uppercase tracking-[0.2em] text-white/30 animate-pulse">Synchronizing Data...</p>
        </div>

        <div v-else-if="error" class="max-w-md mx-auto text-center py-20 rounded-[3rem] bg-white/5 border border-white/10 p-12 backdrop-blur-3xl shadow-2xl">
           <div class="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
              <ExclamationTriangleIcon class="w-8 h-8" />
           </div>
           <h3 class="text-xl font-black mb-2">連結中斷</h3>
           <p class="text-white/40 text-sm mb-8 leading-relaxed">{{ error }}</p>
           <button @click="tripStore.fetchTrips()" class="px-8 py-3 bg-red-500/10 text-red-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">重新讀取</button>
        </div>

        <!-- Empty State -->
        <div v-else-if="trips.length === 0" class="flex flex-col items-center justify-center py-32 bg-white/5 rounded-[3rem] border border-dashed border-white/10 text-center backdrop-blur-xl">
            <div class="w-32 h-32 bg-secondary-900 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border border-white/5 relative group">
               <span class="text-6xl group-hover:scale-125 transition-transform">✈️</span>
               <div class="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <h3 class="text-2xl font-black mb-4">尚無航點紀錄</h3>
            <p class="text-white/40 max-w-xs mx-auto mb-10 text-sm leading-relaxed font-medium">
               目前還沒有任何計畫。準備好迎接下一場未知的探索了嗎？
            </p>
            <button @click="isCreateModalOpen = true"
                class="px-10 py-4 bg-primary-600 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary-600/20">
                立即部署計畫
            </button>
        </div>

        <!-- Trip Grid -->
        <div v-else class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <TripCard v-for="trip in trips" :key="trip.id" :trip="trip" />
          
          <!-- Create New Card -->
          <button @click="isCreateModalOpen = true" 
            class="group relative flex flex-col items-center justify-center min-h-[350px] rounded-[2.5rem] border-2 border-dashed border-white/10 hover:border-primary-500/50 hover:bg-white/5 transition-all duration-500">
             <div class="w-16 h-16 rounded-[1.5rem] bg-white/5 group-hover:bg-primary-600 flex items-center justify-center mb-4 transition-all duration-500 shadow-xl">
                <PlusIcon class="w-8 h-8 text-white/20 group-hover:text-white group-hover:scale-110 transition-all duration-500" />
             </div>
             <span class="text-xs font-black text-white/20 group-hover:text-white uppercase tracking-[0.2em] transition-colors">建立新旅程</span>
             
             <!-- Corner Decoration -->
             <div class="absolute top-6 right-6 w-2 h-2 rounded-full bg-white/5 group-hover:bg-primary-500 transition-colors"></div>
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
import { onMounted, ref } from 'vue'
import { PlusIcon, UserGroupIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const tripStore = useTripStore()
const { trips, loading, error } = storeToRefs(tripStore)
const isCreateModalOpen = ref(false)
const isJoinModalOpen = ref(false)

onMounted(() => {
  tripStore.fetchTrips()
})

function handleTripCreated(_id: string) {
  tripStore.fetchTrips() // Refresh list
}

</script>
