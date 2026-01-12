<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface Props {
  departureDate: string // YYYY-MM-DD
  createdAt?: string    // Optional: when trip was created for better progress calculation
}

const props = withDefaults(defineProps<Props>(), {
  createdAt: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
})

const timeLeft = ref({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0
})

const status = ref<'upcoming' | 'ongoing' | 'ended'>('upcoming')
const progress = ref(0)
let timer: number | null = null

function calculateProgress() {
  const now = new Date().getTime()
  const start = new Date(props.createdAt).getTime()
  const end = new Date(props.departureDate).getTime()
  
  const total = end - start
  const elapsed = now - start
  
  if (total <= 0) return 100
  const p = (elapsed / total) * 100
  return Math.min(Math.max(p, 0), 100)
}

function updateTimer() {
  const now = new Date().getTime()
  const start = new Date(props.departureDate).getTime()
  
  if (now >= start) {
    status.value = 'ongoing'
    progress.value = 100
    return
  }

  status.value = 'upcoming'
  const distance = start - now
  
  timeLeft.value = {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((distance % (1000 * 60)) / 1000)
  }
  
  progress.value = calculateProgress()
}

onMounted(() => {
  updateTimer()
  timer = window.setInterval(updateTimer, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="minimal-horizontal-countdown group cursor-default">
    <div class="flex flex-col gap-1.5">
      <!-- Simplified Countdown Display -->
      <div class="flex items-baseline justify-between gap-4">
        <div v-if="status === 'upcoming'" class="flex items-baseline gap-1">
          <span class="text-xs font-bold text-secondary-400 font-sans uppercase tracking-wider">距離出發還有</span>
          <span class="text-2xl font-black text-secondary-900 font-display tabular-nums leading-none mx-1">
            {{ timeLeft.days }}
          </span>
          <span class="text-xs font-bold text-secondary-400 font-sans uppercase tracking-wider">天</span>
        </div>
        <div v-else class="text-sm font-black text-emerald-600 font-sans tracking-wider">
          旅途中，享受當下！
        </div>

        <div class="text-[10px] font-black text-primary-500 font-sans tracking-tight">
          已完成 {{ Math.round(progress) }}% 準備
        </div>
      </div>

      <!-- Slim Progress Bar -->
      <div class="relative h-1 w-full bg-secondary-100/50 rounded-full overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-primary-500 to-blue-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(59,130,246,0.2)]"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>

      <!-- Detail Grid (Hover Reveal) -->
      <div v-if="status === 'upcoming'" class="flex justify-start items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div class="flex gap-3 text-[10px] font-bold text-secondary-400 tabular-nums">
          <span>{{ timeLeft.hours }}時</span>
          <span>{{ timeLeft.minutes }}分</span>
          <span>{{ timeLeft.seconds }}秒</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Righteous&family=Outfit:wght@400;500;700;900&display=swap');

.font-display {
  font-family: 'Righteous', sans-serif;
}

.font-sans {
  font-family: 'Outfit', sans-serif, "Microsoft JhengHei", "微軟正黑體";
}

.minimal-horizontal-countdown {
  width: 100%;
}

/* Custom easing for progress bar */
.transition-all {
  transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
