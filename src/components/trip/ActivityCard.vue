<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer">
    <div class="flex items-start gap-3">
      <!-- Order / Time Badge -->
      <div class="flex flex-col items-center min-w-[3rem]">
        <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
          {{ index }}
        </div>
        <div v-if="isValidTime(activity.start_time)" class="mt-1 text-xs font-mono text-gray-500">
          {{ formatTime(activity.start_time) }}
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <h3 class="font-bold text-gray-900 truncate">{{ activity.name }}</h3>
        
        <div v-if="activity.location" class="flex items-center gap-1 mt-1 text-xs text-gray-500">
          <span class="truncate">📍 {{ activity.location }}</span>
        </div>

        <div v-if="activity.notes" class="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg line-clamp-2">
          {{ activity.notes }}
        </div>
        
        <div class="mt-2 flex items-center gap-2">
           <span v-if="activity.duration" class="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
             ⏱ {{ activity.duration }} min
           </span>
           <!-- Future: Add category tags here if available -->
        </div>
      </div>
      
       <!-- Actions (Optional, passed via slot or default) -->
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activity: any
  index: number
}>()

const formatTime = (time: string) => {
  return time?.substring(0, 5)
}

const isValidTime = (time: string) => {
    return time && time.length >= 5;
}
</script>
