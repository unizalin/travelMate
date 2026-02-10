<template>
  <div class="glass-panel p-6 rounded-2xl w-full max-w-sm border border-white/10 shadow-xl backdrop-blur-md bg-black/40 text-white transition-all duration-300 hover:bg-black/50">
    <h2 class="text-2xl font-bold mb-6 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
      哪裡去旅行？
    </h2>

    <div class="space-y-6">
      <!-- Days Input -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">旅遊天數</label>
        <div class="flex gap-2">
           <button 
             v-for="days in [3, 5, 7, 10]" 
             :key="days"
             @click="store.filterDays = days"
             :class="[
               'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 border',
               store.filterDays === days 
                 ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-500/20' 
                 : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-400'
             ]"
           >
             {{ days }}天
           </button>
        </div>
      </div>

      <!-- Distance Input -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">
            距離範圍 
            <span v-if="store.filterDistance" class="ml-2 text-primary-400 text-xs">
                ( < {{ store.filterDistance }} km)
            </span>
            <span v-else class="ml-2 text-gray-500 text-xs">(全球)</span>
        </label>
        <input 
          type="range" 
          min="1000" 
          max="20000" 
          step="1000"
          v-model="rangeValue"
          @input="updateDistance"
          class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
        />
        <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>1000km</span>
            <span>Global</span>
        </div>
      </div>

      <!-- Throw Button -->
      <button 
        @click="handleThrow"
        :disabled="store.isThrowing"
        class="w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all duration-300 transform active:scale-95 group relative overflow-hidden"
        :class="store.isThrowing ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-primary-500 to-purple-600 hover:shadow-primary-500/30'"
      >
        <span class="relative z-10 flex items-center justify-center gap-2">
            <span v-if="store.isThrowing" class="animate-spin text-xl">🎯</span>
            <span v-else>射飛鏢 GO! 🎯</span>
        </span>
        <!-- Shine effect -->
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine"></div>
      </button>

      <!-- Result Feedback -->
      <transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0">
        <div v-if="store.dartResult && !store.isThrowing" class="mt-4 p-4 rounded-xl bg-primary-500/20 border border-primary-500/30">
            <h3 class="font-bold text-primary-300 text-sm mb-1">目的地鎖定！</h3>
            <p class="text-lg font-bold text-white">{{ store.dartResult.name }}</p>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useExploreStore } from '@/stores/explore'

const store = useExploreStore()
const rangeValue = ref(20000)

const updateDistance = (e: Event) => {
    const val = Number((e.target as HTMLInputElement).value)
    rangeValue.value = val
    store.filterDistance = val >= 20000 ? null : val
}

const handleThrow = () => {
    store.throwDart()
}
</script>

<style scoped>
input[type=range]::-webkit-slider-thumb {
  width: 16px;
  border-radius: 50%;
  background: #a855f7;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
  margin-top: -4px;
}
</style>
