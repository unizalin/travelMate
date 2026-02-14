<script setup lang="ts">
import { TrophyIcon, GlobeAltIcon, MapPinIcon, RocketLaunchIcon } from '@heroicons/vue/24/outline'

const stats = {
  level: 5,
  title: 'Pacific Explorer',
  countries: 12,
  mileage: '42,500',
  trips: 28
}

const achievements = [
  { id: 1, name: '首航成功', icon: RocketLaunchIcon, color: 'text-blue-400' },
  { id: 2, name: '環球旅行家', icon: GlobeAltIcon, color: 'text-emerald-400' },
  { id: 3, name: '景點達人', icon: MapPinIcon, color: 'text-amber-400' },
]
</script>

<template>
  <div class="p-8 pb-32 max-w-2xl mx-auto h-full overflow-y-auto">
    <!-- Profile Header -->
    <div class="flex flex-col items-center mb-12 animate-fade-in">
        <div class="relative mb-6">
            <div class="w-24 h-24 rounded-full border-4 border-primary-500/30 p-1">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" class="w-full h-full rounded-full bg-secondary-800" />
            </div>
            <div class="absolute -bottom-2 -right-2 bg-primary-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                LV.{{ stats.level }}
            </div>
        </div>
        <h2 class="text-2xl font-black text-white mb-2">{{ stats.title }}</h2>
        <p class="text-white/40 text-sm font-bold tracking-widest uppercase">ID: 1770878105468</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-3 gap-4 mb-12">
        <div class="p-6 rounded-[2rem] bg-white/5 border border-white/5 text-center">
            <div class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Countries</div>
            <div class="text-2xl font-black text-white">{{ stats.countries }}</div>
        </div>
        <div class="p-6 rounded-[2rem] bg-white/5 border border-white/5 text-center">
            <div class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Mileage</div>
            <div class="text-2xl font-black text-white">{{ stats.mileage }}</div>
        </div>
        <div class="p-6 rounded-[2rem] bg-white/5 border border-white/5 text-center">
            <div class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Trips</div>
            <div class="text-2xl font-black text-white">{{ stats.trips }}</div>
        </div>
    </div>

    <!-- Achievements -->
    <div class="mb-12">
        <div class="flex items-center gap-2 mb-6">
            <TrophyIcon class="w-5 h-5 text-amber-500" />
            <span class="text-sm font-black text-white uppercase tracking-widest">Achievements</span>
        </div>
        <div class="flex flex-wrap gap-4">
            <div v-for="award in achievements" :key="award.id" class="flex flex-col items-center gap-3 p-6 rounded-[2.5rem] bg-white/5 border border-white/5 w-[calc(33.33%-11px)]">
                <component :is="award.icon" class="w-8 h-8" :class="award.color" />
                <span class="text-[10px] font-bold text-white/60 text-center">{{ award.name }}</span>
            </div>
        </div>
    </div>

    <!-- Recent Footprints -->
    <div>
        <div class="flex items-center gap-2 mb-6">
            <MapPinIcon class="w-5 h-5 text-primary-500" />
            <span class="text-sm font-black text-white uppercase tracking-widest">Recent Footprints</span>
        </div>
        <div class="space-y-4">
            <div v-for="i in 3" :key="i" class="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                    <div class="text-white font-black mb-1">Tokyo Tower</div>
                    <div class="text-xs text-white/40">2026.02.12 • Tokyo, Japan</div>
                </div>
                <div class="p-2 rounded-full bg-white/5 text-white/20">
                    <MapPinIcon class="w-5 h-5" />
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 1s ease-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
