<script setup lang="ts">
import CreateTripModal from '@/components/modals/CreateTripModal.vue'
import TripCard from '@/components/trip/TripCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useTripStore } from '@/stores/trip'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { UserCircleIcon, ArrowLeftOnRectangleIcon, UserIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'

const authStore = useAuthStore()
const tripStore = useTripStore()
const { trips, loading, error } = storeToRefs(tripStore)
const isCreateModalOpen = ref(false)

onMounted(() => {
  tripStore.fetchTrips()
})

function handleTripCreated(_id: string) {
  tripStore.fetchTrips() // Refresh list
}

</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">My Trips</h1>
        <div class="flex items-center space-x-4">
          <router-link to="/join"
            class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            Join Trip
          </router-link>
          <button @click="isCreateModalOpen = true"
            class="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
            Create Trip
          </button>
          <!-- Profile Dropdown -->
          <Menu as="div" class="relative">
            <MenuButton class="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              <span class="sr-only">Open user menu</span>
              <div v-if="authStore.user?.user_metadata.avatar_url" class="h-8 w-8 rounded-full overflow-hidden">
                <img :src="authStore.user.user_metadata.avatar_url" alt="" />
              </div>
              <UserCircleIcon v-else class="h-8 w-8 text-gray-400" aria-hidden="true" />
            </MenuButton>

            <transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <MenuItems class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div class="px-4 py-2 border-b border-gray-100">
                  <p class="text-xs text-gray-500">登入為</p>
                  <p class="text-sm font-medium text-gray-900 truncate">{{ authStore.user?.email }}</p>
                </div>
                <MenuItem v-slot="{ active }">
                  <router-link to="/profile" :class="[active ? 'bg-gray-100' : '', 'flex items-center px-4 py-2 text-sm text-gray-700']">
                    <UserIcon class="mr-3 h-4 w-4 text-gray-400" />
                    個人資料
                  </router-link>
                </MenuItem>
                <MenuItem v-slot="{ active }">
                  <button @click="authStore.signOut()" :class="[active ? 'bg-gray-100' : '', 'flex w-full items-center px-4 py-2 text-sm text-red-600']">
                    <ArrowLeftOnRectangleIcon class="mr-3 h-4 w-4 text-red-400" />
                    登出
                  </button>
                </MenuItem>
              </MenuItems>
            </transition>
          </Menu>
        </div>
      </div>
    </header>
    <main>
      <div class="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div v-if="loading" class="text-center py-10">
          <p class="text-gray-500">Loading trips...</p>
        </div>

        <div v-else-if="error" class="text-center py-10">
          <p class="text-red-500">{{ error }}</p>
        </div>

        <div v-else-if="trips.length === 0" class="text-center py-20">
          <h3 class="mt-2 text-sm font-semibold text-gray-900">No trips</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by creating a new trip or joining one.</p>
          <div class="mt-6">
            <button @click="isCreateModalOpen = true"
              class="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
              <span class="mr-2">+</span> Create Trip
            </button>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <TripCard v-for="trip in trips" :key="trip.id" :trip="trip" />
        </div>
      </div>
    </main>

    <CreateTripModal :is-open="isCreateModalOpen" @close="isCreateModalOpen = false" @success="handleTripCreated" />
  </div>
</template>
