<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import TripReader from '@/components/trip/TripReader.vue'
import { publicIcelandJourney } from '@/data/icelandPublic'

const route = useRoute()
const supportedShare = computed(() => {
  const tripId = String(route.params.tripId ?? '')
  return !tripId || tripId === 'iceland' || tripId === publicIcelandJourney.tripId
})
</script>

<template>
  <TripReader v-if="supportedShare" :journey="publicIcelandJourney" public-only />
  <main v-else class="flex min-h-screen items-center justify-center bg-[#f5f8f7] px-6 text-center text-slate-900">
    <section class="max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_12px_36px_rgba(22,54,54,.08)]">
      <p class="text-[11px] font-bold uppercase tracking-[.2em] text-teal-700">TripBook / Share</p>
      <h1 class="mt-3 text-2xl font-black">找不到這份共享旅程</h1>
      <p class="mt-3 text-sm leading-6 text-slate-500">這個共享連結尚未註冊公開閱讀資料。</p>
      <RouterLink to="/share/iceland" class="mt-6 inline-flex min-h-11 items-center rounded-2xl bg-teal-900 px-5 text-sm font-bold text-white">回到冰島行程</RouterLink>
    </section>
  </main>
</template>
