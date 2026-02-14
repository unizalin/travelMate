<template>
  <div 
    @click="goToDetail"
    class="group relative overflow-hidden rounded-[2.5rem] bg-secondary-900/40 backdrop-blur-3xl border border-white/5 hover:border-primary-500/50 transition-all duration-500 cursor-pointer shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-1 animate-fade-in"
  >
    <!-- Card Header / Image Area -->
    <div class="h-44 relative overflow-hidden bg-[#0a1224]">
      <!-- Background Patterns -->
      <div class="absolute inset-0 opacity-20">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#3b82f644_0%,transparent_70%)]"></div>
        <div class="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <!-- Icon Decoration -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="relative">
          <GlobeAltIcon class="w-16 h-16 text-primary-500/20 group-hover:scale-110 group-hover:text-primary-500/40 transition-all duration-700" />
          <div class="absolute inset-0 bg-primary-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      </div>

      <!-- Top Badges -->
      <div class="absolute top-4 left-4 right-4 flex justify-between items-start">
        <div class="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-black text-primary-400 uppercase tracking-widest">
            {{ trip.start_date }}
        </div>
        <div class="px-3 py-1 rounded-full bg-primary-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary-500/20">
            {{ trip.destination }}
        </div>
      </div>
    </div>

    <!-- Card Content -->
    <div class="p-6">
      <div class="mb-4">
        <h3 class="text-xl font-black text-white group-hover:text-primary-400 transition-colors line-clamp-1 mb-1">
          {{ trip.name }}
        </h3>
        <p class="text-xs font-medium text-white/40 uppercase tracking-widest">
            Next Adventure
        </p>
      </div>

      <!-- Bottom Info -->
      <div class="flex items-center justify-between">
        <div class="flex -space-x-2">
            <div 
                v-for="i in 3" 
                :key="i"
                class="w-6 h-6 rounded-full border-2 border-[#050b18] bg-secondary-800 flex items-center justify-center text-[8px] font-black text-white/40"
            >
                U{{ i }}
            </div>
        </div>
        
        <div 
            v-if="daysUntilStart > 0"
            class="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]"
        >
            In {{ daysUntilStart }} Days
        </div>
        <div 
            v-else
            class="flex items-center gap-1.5"
        >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Ongoing</span>
        </div>
      </div>
    </div>

    <!-- Interactive Border Layer -->
    <div class="absolute inset-0 border border-white/5 rounded-[2.5rem] pointer-events-none group-hover:border-primary-500/30 transition-colors"></div>
  </div>
</template>

<script setup lang="ts">
import type { Database } from '@/types/database';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { GlobeAltIcon } from '@heroicons/vue/24/outline';

type Trip = Database['public']['Tables']['trips']['Row']

const props = defineProps<{
  trip: Trip
}>()

const router = useRouter()

const daysUntilStart = computed(() => {
  const start = new Date(props.trip.start_date)
  const now = new Date()
  const diffTime = start.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

function goToDetail() {
  router.push(`/trips/${props.trip.id}`)
}
</script>
