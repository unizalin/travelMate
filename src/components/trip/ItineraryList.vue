<script setup lang="ts">
import { useItineraryStore } from '@/stores/itinerary'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { ChevronUpIcon } from '@heroicons/vue/20/solid'
import { ref } from 'vue'
import ActivityItem from '@/components/trip/ActivityItem.vue'
import AddActivityModal from '@/components/modals/AddActivityModal.vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itineraries: any[]
}>()

const itineraryStore = useItineraryStore()
const isModalOpen = ref(false)
const selectedItineraryId = ref('')
const selectedMaxOrder = ref(0)

function openAddModal(itineraryId: string, activities: any[]) {
  selectedItineraryId.value = itineraryId
  selectedMaxOrder.value = activities?.length > 0
    ? Math.max(...activities.map((a: any) => a.order_index))
    : 0
  isModalOpen.value = true
}

function handleDeleteActivity(id: string, itineraryId: string) {
  if (confirm('Delete this activity?')) {
    itineraryStore.deleteActivity(id, itineraryId)
  }
}
</script>

<template>
  <div class="w-full space-y-4">
    <div v-if="itineraries.length === 0" class="text-center py-10 text-gray-500">
      No itinerary days found.
    </div>

    <Disclosure v-for="(itinerary, index) in itineraries" :key="itinerary.id" v-slot="{ open }"
      :default-open="index === 0">
      <div class="rounded-lg bg-white shadow">
        <DisclosureButton
          class="flex w-full justify-between rounded-t-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75">
          <div class="flex items-center space-x-2">
            <span>Day {{ itinerary.day_number }}</span>
            <span class="text-gray-500 font-normal">({{ itinerary.date }})</span>
          </div>
          <ChevronUpIcon :class="open ? 'rotate-180 transform' : ''" class="h-5 w-5 text-blue-500" />
        </DisclosureButton>
        <DisclosurePanel class="px-4 pb-4 pt-4 text-sm text-gray-500 space-y-3">
          <!-- Activities List -->
          <div v-if="!itinerary.activities || itinerary.activities.length === 0"
            class="text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">
            <p>No activities yet.</p>
            <button @click="openAddModal(itinerary.id, itinerary.activities)"
              class="mt-2 text-primary-600 hover:text-primary-700 font-medium">
              + Add first activity
            </button>
          </div>

          <div v-else class="space-y-3">
            <ActivityItem v-for="activity in itinerary.activities" :key="activity.id" :activity="activity"
              @delete="(id) => handleDeleteActivity(id, itinerary.id)" />

            <button @click="openAddModal(itinerary.id, itinerary.activities)"
              class="w-full py-2 flex items-center justify-center space-x-1 text-primary-600 hover:bg-primary-50 rounded border border-dashed border-primary-200">
              <span>+ Add Activity</span>
            </button>
          </div>
        </DisclosurePanel>
      </div>
    </Disclosure>

    <AddActivityModal :is-open="isModalOpen" :itinerary-id="selectedItineraryId" :current-order="selectedMaxOrder"
      @close="isModalOpen = false" @success="() => { }" />
  </div>
</template>
