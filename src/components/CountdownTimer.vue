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
  <div class="bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl p-6 text-white text-center shadow-lg">
    <div v-if="status === 'ended'">
      <h3 class="text-2xl font-bold">旅程已結束</h3>
      <p class="mt-2 text-primary-100">希望您留下了美好的回憶！</p>
    </div>

    <div v-else-if="status === 'ongoing'">
      <h3 class="text-3xl font-bold animate-pulse">旅程進行中！</h3>
      <p class="mt-2 text-primary-100">享受您的旅程！</p>
    </div>

    <div v-else>
      <h3 class="text-lg font-medium text-primary-100 mb-4">距離出發還有</h3>
      <div class="grid grid-cols-4 gap-4 max-w-lg mx-auto">
        <div class="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
          <span class="block text-3xl font-bold">{{ timeLeft.days }}</span>
          <span class="text-xs text-primary-100 uppercase tracking-wide">天</span>
        </div>
        <div class="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
          <span class="block text-3xl font-bold">{{ timeLeft.hours }}</span>
          <span class="text-xs text-primary-100 uppercase tracking-wide">時</span>
        </div>
        <div class="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
          <span class="block text-3xl font-bold">{{ timeLeft.minutes }}</span>
          <span class="text-xs text-primary-100 uppercase tracking-wide">分</span>
        </div>
        <div class="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
          <span class="block text-3xl font-bold">{{ timeLeft.seconds }}</span>
          <span class="text-xs text-primary-100 uppercase tracking-wide">秒</span>
        </div>
      </div>
    </div>
  </div>
</template>
