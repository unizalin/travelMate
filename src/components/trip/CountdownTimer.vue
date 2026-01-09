<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  targetDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}>()

const timeLeft = ref({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0
})

const status = ref<'upcoming' | 'ongoing' | 'ended'>('upcoming')
let timer: number | null = null

function updateTimer() {
  const now = new Date().getTime()
  const start = new Date(props.targetDate).getTime()
  // End date should be end of the day
  const end = new Date(props.endDate).getTime() + 24 * 60 * 60 * 1000 - 1

  if (now > end) {
    status.value = 'ended'
    return
  }

  if (now >= start && now <= end) {
    status.value = 'ongoing'
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
  <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 md:p-10 shadow-lg text-white text-center">
    <div v-if="status === 'ended'">
      <h3 class="text-2xl md:text-3xl font-bold">旅程已結束</h3>
      <p class="mt-2 text-blue-100">希望您留下了美好的回憶！</p>
    </div>

    <div v-else-if="status === 'ongoing'">
      <h3 class="text-3xl md:text-4xl font-bold animate-pulse">旅程進行中！</h3>
      <p class="mt-2 text-blue-100 text-lg">享受您的旅程！</p>
    </div>

    <div v-else>
      <h3 class="text-lg md:text-xl font-medium text-blue-100 mb-6">距離出發還有</h3>
      <div class="grid grid-cols-4 gap-3 md:gap-4 max-w-2xl mx-auto">
        <div class="bg-blue-400/30 rounded-xl p-4 md:p-6 backdrop-blur-sm animate-[pulse_3s_ease-in-out_infinite]">
          <div class="text-4xl md:text-5xl lg:text-6xl font-bold">{{ timeLeft.days }}</div>
          <div class="text-xs md:text-base text-blue-100 mt-1 uppercase tracking-wide">天</div>
        </div>
        <div class="bg-blue-400/30 rounded-xl p-4 md:p-6 backdrop-blur-sm animate-[pulse_3s_ease-in-out_infinite] delay-75">
          <div class="text-4xl md:text-5xl lg:text-6xl font-bold">{{ timeLeft.hours }}</div>
          <div class="text-xs md:text-base text-blue-100 mt-1 uppercase tracking-wide">時</div>
        </div>
        <div class="bg-blue-400/30 rounded-xl p-4 md:p-6 backdrop-blur-sm animate-[pulse_3s_ease-in-out_infinite] delay-150">
          <div class="text-4xl md:text-5xl lg:text-6xl font-bold">{{ timeLeft.minutes }}</div>
          <div class="text-xs md:text-base text-blue-100 mt-1 uppercase tracking-wide">分</div>
        </div>
        <div class="bg-blue-400/30 rounded-xl p-4 md:p-6 backdrop-blur-sm animate-[pulse_3s_ease-in-out_infinite] delay-200">
          <div class="text-4xl md:text-5xl lg:text-6xl font-bold">{{ timeLeft.seconds }}</div>
          <div class="text-xs md:text-base text-blue-100 mt-1 uppercase tracking-wide">秒</div>
        </div>
      </div>
    </div>
  </div>
</template>
