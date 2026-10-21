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
  <main v-else class="airbnb-reader-empty flex min-h-screen items-center justify-center px-6 text-center">
    <section class="max-w-md rounded-[14px] border bg-white p-8">
      <p class="text-[11px] font-bold uppercase tracking-[.2em]">TripBook / Share</p>
      <h1 class="mt-3 text-2xl font-black">找不到這份共享旅程</h1>
      <p class="mt-3 text-sm leading-6">這個共享連結尚未註冊公開閱讀資料。</p>
      <RouterLink to="/share/iceland" class="mt-6 inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-bold text-white">回到冰島行程</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.airbnb-reader-empty {
  background: #fff;
  color: #222;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", sans-serif;
}

.airbnb-reader-empty section {
  border-color: #ddd;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.02), 0 2px 6px rgba(0, 0, 0, 0.04);
}

.airbnb-reader-empty section p:first-child {
  color: #ff385c;
}

.airbnb-reader-empty a {
  background: #ff385c;
}

.airbnb-reader-empty a:focus-visible {
  outline: 3px solid #ffb3c0;
  outline-offset: 2px;
}
</style>
