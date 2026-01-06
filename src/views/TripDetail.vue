<script setup lang="ts">
import InviteModal from '@/components/InviteModal.vue'
// import ItineraryList from '@/components/ItineraryList.vue'
import ItineraryView from '@/views/Itinerary.vue'
import { useItineraryStore } from '@/stores/itinerary'
import { useTripStore } from '@/stores/trip'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const tripStore = useTripStore()
const itineraryStore = useItineraryStore()
const { currentTrip, loading, error } = storeToRefs(tripStore)
// const { itineraries } = storeToRefs(itineraryStore)
const isInviteModalOpen = ref(false)

const tripId = route.params.id as string

onMounted(async () => {
  await tripStore.fetchTripById(tripId)
  if (currentTrip.value) {
    await itineraryStore.fetchItineraries(tripId, currentTrip.value.start_date, currentTrip.value.end_date)
  }
})

function handleDelete() {
  if (confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
    tripStore.deleteTrip(tripId)
      .then(() => router.push('/trips'))
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="loading" class="flex justify-center py-20">
      <p class="text-gray-500">Loading trip details...</p>
    </div>

    <div v-else-if="error" class="flex justify-center py-20">
      <p class="text-red-500">{{ error }}</p>
    </div>

    <div v-else-if="currentTrip">
      <!-- Header -->
      <div class="bg-white shadow">
        <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-3xl font-bold tracking-tight text-gray-900">{{ currentTrip.name }}</h1>
              <p class="mt-2 text-gray-600 flex items-center">
                <span class="mr-4">📍 {{ currentTrip.destination }}</span>
                <span>📅 {{ currentTrip.start_date }} - {{ currentTrip.end_date }}</span>
              </p>
            </div>
            <div class="space-x-3">
              <button @click="isInviteModalOpen = true"
                class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                Invite
              </button>
              <button @click="handleDelete"
                class="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100">
                Delete
              </button>
            </div>
          </div>

          <!-- Members -->
          <div class="mt-6 flex items-center space-x-2">
            <div class="flex -space-x-2 overflow-hidden">
              <img v-for="member in currentTrip.trip_members" :key="member.id"
                class="inline-block h-8 w-8 rounded-full ring-2 ring-white"
                :src="member.profiles?.avatar_url || 'https://via.placeholder.com/32'"
                :alt="member.profiles?.display_name" :title="member.profiles?.display_name" />
            </div>
            <span class="text-sm text-gray-500 ml-2">
              {{ currentTrip.trip_members.length }} members
            </span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <TabGroup>
          <TabList class="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
            <Tab v-for="category in ['Itinerary', 'Expenses', 'Members']" as="template" :key="category"
              v-slot="{ selected }">
              <button :class="[
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white text-primary-700 shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white',
              ]">
                {{ category }}
              </button>
            </Tab>
          </TabList>

          <TabPanels class="mt-2">
            <TabPanel class="rounded-xl bg-gray-50 p-3 shadow-none">
              <!-- Itinerary View (Overview) -->
              <ItineraryView />
            </TabPanel>

            <TabPanel class="rounded-xl bg-white p-3 shadow">
              Expenses content coming soon... (Phase 7)
            </TabPanel>

            <TabPanel class="rounded-xl bg-white p-3 shadow">
              <ul class="divide-y divide-gray-200">
                <li v-for="member in currentTrip.trip_members" :key="member.id" class="py-4 flex items-start">
                  <img class="h-10 w-10 rounded-full"
                    :src="member.profiles?.avatar_url || 'https://via.placeholder.com/40'" alt="" />
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900">{{ member.profiles?.display_name || 'Unknown' }}</p>
                    <p class="text-sm text-gray-500 capitalize">{{ member.role }}</p>
                  </div>
                </li>
              </ul>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>

      <InviteModal :is-open="isInviteModalOpen" :invite-code="currentTrip.invite_code"
        @close="isInviteModalOpen = false" />
    </div>
  </div>
</template>
