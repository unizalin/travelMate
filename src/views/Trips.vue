<script setup lang="ts">
import CreateTripModal from '@/components/CreateTripModal.vue'
import TripCard from '@/components/TripCard.vue'
import { useTripStore } from '@/stores/trip'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'

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
        <div class="space-x-4">
          <router-link to="/join"
            class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            Join Trip
          </router-link>
          <button @click="isCreateModalOpen = true"
            class="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
            Create Trip
          </button>
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
