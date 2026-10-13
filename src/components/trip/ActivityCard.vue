<template>
  <div
    class="relative group glass-card p-5 rounded-3xl transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl cursor-pointer overflow-hidden active:scale-[0.99] animate-fade-in"
    @click="$emit('click')"
  >
    <!-- Background Sparkle / Glow -->
    <div class="absolute -inset-1 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

    <div class="relative flex items-start gap-5">
      <!-- Order / Time Section -->
      <div class="flex flex-col items-center min-w-[3.5rem]">
        <div 
          class="w-12 h-12 rounded-2xl bg-primary-50/50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-black text-lg transition-all duration-500 group-hover:bg-primary-600 group-hover:text-white group-hover:rotate-3 shadow-sm"
        >
          {{ index }}
        </div>
        <div v-if="isValidTime(activity.start_time)" class="mt-3 text-xs font-bold tracking-wider text-secondary-500/80 uppercase font-heading">
          {{ formatTime(activity.start_time) }}
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <h3 class="font-heading font-black text-secondary-900 dark:text-white text-lg truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {{ activity.name }}
        </h3>
        
        <div v-if="activity.location" class="flex items-center gap-2 mt-2 text-xs font-medium text-secondary-500 dark:text-secondary-400">
          <div class="p-1 rounded-full bg-primary-100/50 dark:bg-primary-900/30">
            <svg class="w-3 h-3 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span class="truncate">{{ activity.location }}</span>
        </div>

        <div v-if="activity.notes" class="mt-4 text-sm leading-relaxed text-secondary-600 dark:text-secondary-300 bg-white/40 dark:bg-secondary-800/20 px-4 py-3 rounded-2xl border border-white/40 dark:border-white/5 italic font-medium">
          "{{ activity.notes }}"
        </div>
        
        <div class="mt-5 flex items-center gap-2.5">
           <UIBadge v-if="activity.duration" variant="info" size="xs" class="rounded-lg font-bold px-2.5 py-1">
             <template #icon>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
             </template>
             {{ activity.duration }}m
           </UIBadge>
           
           <UIBadge v-if="activity.category" variant="primary" size="xs" class="rounded-lg font-bold px-2.5 py-1">
             {{ activity.category }}
           </UIBadge>
        </div>
      </div>
      
       <!-- Actions -->
      <div class="flex flex-col gap-2 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
