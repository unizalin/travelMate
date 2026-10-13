<script setup lang="ts">
import { useItineraryStore } from '@/stores/itinerary'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { ChevronUpIcon } from '@heroicons/vue/20/solid'
import { ref } from 'vue'
import ActivityItem from '@/components/trip/ActivityItem.vue'
import AddActivityModal from '@/components/modals/AddActivityModal.vue'
import { useDialog } from '@/composables/useDialog'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itineraries: any[]
}>()

const itineraryStore = useItineraryStore()
const { openDeleteDialog } = useDialog()
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

async function handleDeleteActivity(id: string, itineraryId: string) {
  const confirmed = await openDeleteDialog('刪除行程項', '確定要刪除這個行程活動嗎？')
  if (confirmed) {
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
      <div class="glass-card rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-2xl">
        <DisclosureButton
          class="flex w-full justify-between items-center px-6 py-5 text-left transition-all duration-300 hover:bg-white/40 dark:hover:bg-white/5 focus:outline-none">
          <div class="flex items-center space-x-4">
            <div class="p-2.5 rounded-2xl bg-primary-100/50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
               <span class="text-xs font-black uppercase tracking-widest">Day</span>
               <span class="ml-1 text-lg font-black leading-none">{{ itinerary.day_number }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-black text-secondary-900 dark:text-white uppercase tracking-tight">行程細節</span>
              <span class="text-xs font-bold text-secondary-500 dark:text-secondary-400">{{ itinerary.date }}</span>
            </div>
          </div>
          <div class="p-2 rounded-xl bg-secondary-100/50 dark:bg-white/5 transition-transform duration-500" :class="open ? 'rotate-180' : ''">
            <ChevronUpIcon class="h-5 w-5 text-primary-500" />
          </div>
        </DisclosureButton>
        
        <transition
          enter-active-class="transition duration-500 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-300 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <DisclosurePanel class="px-5 pb-6 pt-2 space-y-4">
            <!-- Activities List -->
            <div v-if="!itinerary.activities || itinerary.activities.length === 0"
              class="flex flex-col items-center justify-center py-8 px-4 bg-white/30 dark:bg-secondary-900/40 rounded-[1.5rem] border-2 border-dashed border-secondary-200/50 dark:border-white/10">
              <div class="w-12 h-12 mb-3 rounded-full bg-secondary-100/50 dark:bg-white/5 flex items-center justify-center text-secondary-400">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-sm font-bold text-secondary-500 dark:text-secondary-400">目前尚無排定的活動</p>
              <button @click="openAddModal(itinerary.id, itinerary.activities)"
                class="mt-4 px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-95">
                開始安排
              </button>
            </div>

            <div v-else class="space-y-4">
              <ActivityItem v-for="activity in itinerary.activities" :key="activity.id" :activity="activity"
                @delete="(id) => handleDeleteActivity(id, itinerary.id)" />

              <button @click="openAddModal(itinerary.id, itinerary.activities)"
                class="w-full py-4 flex items-center justify-center space-x-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 rounded-[1.5rem] border-2 border-dashed border-primary-200/50 dark:border-primary-800/30 transition-all font-black text-sm active:scale-[0.98]">
                <plus-icon class="w-4 h-4" />
                <span>新增活動中心</span>
              </button>
            </div>
          </DisclosurePanel>
        </transition>
      </div>
    </Disclosure>

    <AddActivityModal :is-open="isModalOpen" :itinerary-id="selectedItineraryId" :current-order="selectedMaxOrder"
      @close="isModalOpen = false" @success="() => { }" />
  </div>
</template>
