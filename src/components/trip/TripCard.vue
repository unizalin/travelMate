<template>
  <div 
    @click="goToDetail"
    class="group relative overflow-hidden rounded-[3rem] bg-secondary-900/40 backdrop-blur-3xl border border-white/5 hover:border-primary-500/50 transition-all duration-700 cursor-pointer shadow-[0_30px_60px_rgba(0,0,0,0.5)] hover:shadow-primary-500/20 hover:-translate-y-4 hover:rotate-2 animate-fade-in perspective-2000"
  >
    <!-- Cinematic Overlay -->
    <div class="absolute inset-0 z-10 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

    <!-- Media Area -->
    <div class="h-56 relative overflow-hidden bg-[#0a1224] transition-all duration-700 group-hover:scale-105">
      <!-- High-Tech Patterns -->
      <div class="absolute inset-0 opacity-30">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#3b82f644_0%,transparent_70%)]"></div>
        <div class="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:30px_30px]"></div>
      </div>

      <!-- Tactical Icon -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="relative">
          <GlobeAsiaAustraliaIcon class="w-20 h-20 text-primary-500/20 group-hover:scale-125 group-hover:text-primary-500/50 transition-all duration-1000 group-hover:rotate-[360deg]" />
          <div class="absolute inset-0 bg-primary-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
        </div>
      </div>

      <!-- Telemetry Badges -->
      <div class="absolute top-6 left-6 right-6 flex justify-between items-start z-20">
        <div class="px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 text-[9px] font-black text-primary-400 uppercase tracking-[0.3em] shadow-2xl">
            {{ trip.start_date }}
        </div>
        <div class="px-4 py-2 rounded-2xl bg-white text-secondary-900 text-[9px] font-black uppercase tracking-[0.3em] shadow-2xl group-hover:bg-primary-500 group-hover:text-white transition-colors">
            {{ trip.destination }}
        </div>
      </div>
    </div>

    <!-- Telemetry Data -->
    <div class="p-8 relative z-20 space-y-6">
      <div>
        <h3 class="text-2xl font-black text-white group-hover:text-primary-400 transition-colors line-clamp-1 mb-2 uppercase tracking-tighter">
          {{ trip.name }}
        </h3>
        <div class="flex items-center gap-2">
            <div class="w-1 h-1 rounded-full bg-primary-500 animate-pulse"></div>
            <p class="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">
                目前行程計畫
            </p>
        </div>
      </div>

      <!-- Personnel & Status -->
      <div class="flex items-center justify-between pt-4 border-t border-white/5">
        <div class="flex -space-x-3">
            <div 
                v-for="i in 3" 
                :key="i"
                class="w-8 h-8 rounded-xl border-2 border-[#050b18] bg-white/5 backdrop-blur-xl flex items-center justify-center text-[8px] font-black text-white/40 shadow-2xl group-hover:border-primary-500/50 transition-colors"
            >
                A{{ i }}
            </div>
        </div>
        
        <div 
            v-if="daysUntilStart > 0"
            class="flex flex-col items-end"
        >
            <span class="text-[8px] font-black text-white/10 uppercase tracking-[0.3em] mb-1">倒數</span>
            <span class="text-xs font-black text-primary-400 tabular-nums uppercase tracking-widest">{{ daysUntilStart }} 天</span>
        </div>
        <div 
            v-else
            class="flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20"
        >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em]">規劃中</span>
        </div>
      </div>
    </div>

    <!-- Active Interface Layer -->
    <div class="absolute inset-0 border border-white/5 rounded-[3rem] pointer-events-none group-hover:border-primary-500/30 transition-all z-30 ring-1 ring-inset ring-white/5"></div>
  </div>
</template>

<script setup lang="ts">
import type { Database } from '@/types/database';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { GlobeAsiaAustraliaIcon } from '@heroicons/vue/24/outline';

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
