<script setup lang="ts">
import InviteModal from '@/components/modals/InviteModal.vue'
import ShareDialog from '@/components/modals/ShareDialog.vue'
import CountdownTimer from '@/components/trip/CountdownTimer.vue'
import ItineraryView from '@/views/Itinerary.vue'
import ExpenseView from '@/components/trip/ExpenseView.vue'
import PreparationChecklist from '@/components/preparation/PreparationChecklist.vue'
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
const isShareModalOpen = ref(false)

const tripId = route.params.id as string

onMounted(async () => {
  await tripStore.fetchTripById(tripId)
  if (currentTrip.value) {
    await itineraryStore.fetchItineraries(tripId, currentTrip.value.start_date, currentTrip.value.end_date)
  }
})

import { useDialog } from '@/composables/useDialog';

const { openDeleteDialog } = useDialog()

async function handleDelete() {
  const confirmed = await openDeleteDialog('刪除行程', '確定要刪除此行程嗎？此動作無法復原。')
  if (confirmed) {
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
      <div class="bg-white shadow relative">
        <div class="mx-auto max-w-[1440px] 2xl:max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
          <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <!-- Trip Info -->
            <div>
              <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{{ currentTrip.name }}</h1>
              <div class="mt-2 flex flex-wrap items-center gap-y-2 gap-x-4 xl:gap-x-6 text-sm md:text-base text-gray-600">
                 <span class="flex items-center gap-1">📍 {{ currentTrip.destination }}</span>
                 <span class="flex items-center gap-1">📅 {{ currentTrip.start_date }} - {{ currentTrip.end_date }}</span>
                 
                 <!-- Members Inline for Desktop -->
                 <div class="hidden md:flex items-center space-x-2 border-l pl-4 ml-2 border-gray-300">
                    <div class="flex -space-x-2 overflow-hidden">
                      <img v-for="member in currentTrip.trip_members" :key="member.id"
                        class="inline-block h-6 w-6 rounded-full ring-2 ring-white"
                        :src="member.profiles?.avatar_url || 'https://via.placeholder.com/32'"
                        :alt="member.profiles?.display_name" :title="member.profiles?.display_name" />
                    </div>
                    <span class="text-xs text-gray-500">{{ currentTrip.trip_members.length }} 位成員</span>
                 </div>
              </div>
               <!-- Members block for Mobile (below info) -->
               <div class="flex md:hidden items-center space-x-2 mt-3">
                  <div class="flex -space-x-2 overflow-hidden">
                    <img v-for="member in currentTrip.trip_members" :key="member.id"
                      class="inline-block h-7 w-7 rounded-full ring-2 ring-white"
                      :src="member.profiles?.avatar_url || 'https://via.placeholder.com/32'"
                      :alt="member.profiles?.display_name" />
                  </div>
                  <span class="text-xs text-gray-500 ml-1">{{ currentTrip.trip_members.length }} 位成員</span>
               </div>
               

               <!-- Countdown Integrated into Content Flow -->
               <div class="mt-4 max-w-[400px]">
                 <CountdownTimer 
                   :departure-date="currentTrip.start_date" 
                   :created-at="currentTrip.created_at"
                 />
               </div>
            </div>

            <!-- Action Buttons Group (Right Aligned) -->
            <div class="hidden lg:flex items-center gap-3 xl:gap-4 2xl:gap-6 ml-auto">
              <button @click="router.push(`/trips/${tripId}/map`)"
                class="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-primary-100 hover:bg-primary-500 hover:shadow-primary-200 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <span>🗺️</span> 查看地圖
              </button>
              <div class="flex items-center gap-2">
                <button @click="isInviteModalOpen = true"
                  class="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-secondary-700 shadow-sm ring-1 ring-inset ring-secondary-200 hover:bg-secondary-50 hover:ring-secondary-300 transition-all">
                  邀請
                </button>
                <button @click="isShareModalOpen = true"
                  class="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-secondary-700 shadow-sm ring-1 ring-inset ring-secondary-200 hover:bg-secondary-50 hover:ring-secondary-300 transition-all">
                  分享
                </button>
                <button @click="handleDelete"
                  class="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm hover:bg-red-100 transition-all">
                  刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Floating Action Buttons (FAB) -->
      <div class="fixed bottom-6 right-6 flex flex-col-reverse gap-3 z-40 lg:hidden">
          <!-- Main Map Button -->
          <button @click="router.push(`/trips/${tripId}/map`)" 
             class="w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-500 hover:scale-105 transition-all text-2xl"
             title="查看地圖總覽">
             🗺️
          </button>
          
          <!-- Secondary Buttons (Smaller) -->
           <button @click="isInviteModalOpen = true" 
             class="h-10 px-4 bg-white rounded-full shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 ring-1 ring-gray-200 transition-all"
             title="邀請成員">
             <span class="text-xs font-bold">邀請</span>
          </button>
           <button @click="handleDelete" 
             class="h-10 px-4 bg-white rounded-full shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 ring-1 ring-gray-200 transition-all"
             title="刪除行程">
             <span class="text-xs font-bold">刪除</span>
          </button>
          <button @click="isShareModalOpen = true" 
             class="h-10 px-4 bg-white rounded-full shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 ring-1 ring-gray-200 transition-all"
             title="分享行程">
             <span class="text-xs font-bold">分享</span>
          </button>
      </div>


      <!-- Tabs -->
      <div class="mx-auto max-w-[1440px] 2xl:max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
        <TabGroup>
          <TabList class="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
            <Tab v-for="category in ['行程', '費用', '成員']" as="template" :key="category"
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

            <TabPanel class="rounded-xl bg-white p-6 shadow-none">
              <ExpenseView 
                :trip-id="tripId" 
                :members="currentTrip.trip_members" 
              />
            </TabPanel>

            <TabPanel class="rounded-xl bg-white p-3 shadow">
              <ul class="divide-y divide-gray-200">
                <li v-for="member in currentTrip.trip_members" :key="member.id" class="py-4 flex items-start">
                  <img class="h-10 w-10 rounded-full"
                    :src="member.profiles?.avatar_url || 'https://via.placeholder.com/40'" alt="" />
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900">{{ member.profiles?.display_name || '未知成員' }}</p>
                    <p class="text-sm text-gray-500 capitalize">{{ member.role }}</p>
                  </div>
                </li>
              </ul>

              <!-- Preparation Checklist -->
              <PreparationChecklist :trip-id="tripId" />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>

      <InviteModal :is-open="isInviteModalOpen" :invite-code="currentTrip.invite_code"
        @close="isInviteModalOpen = false" />

      <ShareDialog 
        :is-open="isShareModalOpen" 
        :trip-id="tripId" 
        :trip-name="currentTrip.name"
        @close="isShareModalOpen = false" 
      />
    </div>
  </div>
</template>
