<script setup lang="ts">
import { computed } from 'vue'
import WeatherTooltip from './WeatherTooltip.vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const props = defineProps<{
  itinerary: any
  weather?: any
}>()

const formattedDate = computed(() => {
  const date = new Date(props.itinerary.date)
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date)
})

const activityCount = computed(() => props.itinerary.activities?.length || 0)
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
    <!-- Header -->
    <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
      <div>
        <h3 class="text-lg font-bold text-gray-900">第 {{ itinerary.day_number }} 天</h3>
        <p class="text-sm text-gray-500">{{ formattedDate }}</p>
      </div>
      <WeatherTooltip :weather="weather" />
    </div>

    <!-- Content -->
    <div class="p-4">
      <div v-if="activityCount > 0" class="space-y-4">
        <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
        <div v-for="activity in itinerary.activities" :key="activity.id" class="flex gap-3">
          <div class="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600">
            {{ activity.order_index + 1 }}
          </div>
          <div>
            <h4 class="font-medium text-gray-900">{{ activity.name }}</h4>
            <div class="text-sm text-gray-500 space-y-1">
              <p v-if="activity.duration" class="flex items-center">
                 <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 {{ activity.duration }} 分鐘
              </p>
               <p v-if="activity.location" class="flex items-center">
                 <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
                 {{ activity.location }}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-6 text-gray-400">
        <p>尚未安排行程</p>
      </div>
    </div>
  </div>
</template>
