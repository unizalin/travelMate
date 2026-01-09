<template>
  <UICard
    shadow="sm"
    hoverable
    body-class="p-4"
    @click="$emit('click')"
    class="group animate-fade-in"
  >
    <div class="flex items-start gap-4">
      <!-- Order / Time Section -->
      <div class="flex flex-col items-center min-w-[3.5rem] pt-1">
        <div 
          class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-base transition-colors group-hover:bg-primary-600 group-hover:text-white"
        >
          {{ index }}
        </div>
        <div v-if="isValidTime(activity.start_time)" class="mt-2 text-xs font-semibold text-secondary-500 font-body">
          {{ formatTime(activity.start_time) }}
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <h3 class="font-heading font-bold text-secondary-900 text-base truncate group-hover:text-primary-600 transition-colors">
          {{ activity.name }}
        </h3>
        
        <div v-if="activity.location" class="flex items-center gap-1.5 mt-1.5 text-xs text-secondary-500">
          <svg class="w-3.5 h-3.5 flex-shrink-0 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="truncate">{{ activity.location }}</span>
        </div>

        <div v-if="activity.notes" class="mt-3 text-sm text-secondary-600 bg-secondary-50/50 p-3 rounded-xl line-clamp-2 italic border border-secondary-100/50">
          "{{ activity.notes }}"
        </div>
        
        <div class="mt-4 flex items-center gap-3">
           <UIBadge v-if="activity.duration" variant="info" size="xs">
             <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             {{ activity.duration }} min
           </UIBadge>
           
           <UIBadge v-if="activity.category" variant="primary" size="xs">
             {{ activity.category }}
           </UIBadge>
        </div>
      </div>
      
       <!-- Actions -->
      <div class="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <slot name="actions"></slot>
      </div>
    </div>
  </UICard>
</template>

<script setup lang="ts">
import UICard from '@/components/ui/Card.vue'
import UIBadge from '@/components/ui/Badge.vue'

defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activity: any
  index: number
}>()

defineEmits(['click'])

const formatTime = (time: string) => {
  return time?.substring(0, 5)
}

const isValidTime = (time: string) => {
    return time && time.length >= 5;
}
</script>
