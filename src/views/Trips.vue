<script setup lang="ts">
import CreateTripModal from '@/components/modals/CreateTripModal.vue'
import JoinTripModal from '@/components/modals/JoinTripModal.vue'
import TripCard from '@/components/trip/TripCard.vue'
import UserMenu from '@/components/common/UserMenu.vue'
import { useTripStore } from '@/stores/trip'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { PlusIcon, UserGroupIcon } from '@heroicons/vue/24/outline'

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

<template>
  <div class="min-h-screen bg-[#F8FAFC]">
    <!-- Header -->
    <header class="bg-white sticky top-0 z-30 shadow-sm/50 border-b border-gray-100 backdrop-blur-xl bg-white/80">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-14">
           <!-- Logo & Title -->
           <div class="flex items-center gap-3">
              <router-link to="/" class="flex items-center gap-2 group">
                 <img src="@/assets/img/TravelMate.png" alt="TravelMate" class="h-8 w-auto group-hover:scale-105 transition-transform" />
                 <span class="text-xl font-black text-gray-900 tracking-tight hidden sm:block">TravelMate</span>
              </router-link>
           </div>

           <!-- Actions -->
           <div class="flex items-center gap-3 sm:gap-4">
              <button @click="isJoinModalOpen = true"
                class="hidden sm:flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100">
                <UserGroupIcon class="w-4 h-4" />
                加入旅程
              </button>
              
              <button @click="isCreateModalOpen = true"
                class="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-100 hover:bg-primary-500 hover:shadow-primary-200 hover:-translate-y-0.5 transition-all">
                <PlusIcon class="w-4 h-4" />
                <span class="hidden sm:inline">建立旅程</span>
                <span class="sm:hidden">建立</span>
              </button>
              
              <div class="h-6 w-px bg-gray-200 hidden sm:block"></div>
              
              <!-- Profile Dropdown -->
              <UserMenu />
           </div>
        </div>
      </div>
    </header>

    <main class="py-8 sm:py-10">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <!-- Page Title -->
        <div class="mb-8 flex items-end justify-between">
           <div>
              <h1 class="text-3xl font-black text-gray-900 tracking-tight">我的旅程</h1>
              <p class="mt-2 text-sm font-medium text-gray-500">管理您的所有精彩冒險</p>
           </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-20">
           <div class="w-10 h-10 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin mb-4"></div>
           <p class="text-gray-400 font-medium">正在載入精彩旅程...</p>
        </div>

        <div v-else-if="error" class="text-center py-20 rounded-3xl bg-white border border-red-100 p-8 shadow-sm">
           <div class="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
           </div>
           <h3 class="text-lg font-bold text-gray-900 mb-2">載入失敗</h3>
           <p class="text-red-500 mb-6">{{ error }}</p>
           <button @click="tripStore.fetchTrips()" class="text-primary-600 font-bold hover:underline">重試</button>
        </div>

        <!-- Empty State -->
        <div v-else-if="trips.length === 0" class="flex flex-col items-center justify-center py-20 sm:py-32 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
            <div class="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mb-6 shadow-inner text-4xl">
               ✈️
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">還沒有任何旅程</h3>
            <p class="text-gray-500 max-w-sm mx-auto mb-8 font-medium">
               準備好開始下一段冒險了嗎？<br>建立一個新旅程，或是加入朋友的計畫！
            </p>
            <div class="flex gap-4">
              <button @click="isCreateModalOpen = true"
                class="rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-100 hover:bg-primary-500 hover:shadow-primary-200 hover:-translate-y-0.5 transition-all">
                開始建立旅程
              </button>
            </div>
        </div>

        <!-- Trip Grid -->
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <TripCard v-for="trip in trips" :key="trip.id" :trip="trip" />
          
          <!-- Create New Card (Design choice: add card at the end) -->
          <button @click="isCreateModalOpen = true" class="group flex flex-col items-center justify-center min-h-[300px] rounded-3xl border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all cursor-pointer">
             <div class="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center mb-3 transition-colors shadow-sm">
                <PlusIcon class="w-6 h-6 text-gray-400 group-hover:text-primary-500" />
             </div>
             <span class="text-sm font-bold text-gray-400 group-hover:text-primary-600">建立新旅程</span>
          </button>
        </div>
      </div>
    </main>

    <CreateTripModal :is-open="isCreateModalOpen" @close="isCreateModalOpen = false" @success="handleTripCreated" />
    <JoinTripModal :is-open="isJoinModalOpen" @close="isJoinModalOpen = false" @success="handleTripCreated" />
  </div>
</template>
