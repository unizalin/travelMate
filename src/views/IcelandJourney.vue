<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TripReader from '@/components/trip/TripReader.vue'
import { ICELAND_FLIGHTS_PATH } from '@/router/iceland'
import type { useAuthStore } from '@/stores/auth'

const CompanionJourney = defineAsyncComponent(async () => (await import('./IcelandPlanner.vue')).default)
const route = useRoute()
const router = useRouter()
const auth = shallowRef<ReturnType<typeof useAuthStore> | null>(null)
const signedIn = computed(() => Boolean(auth.value?.user))
const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const loginError = shallowRef('')
onMounted(async () => {
  if (!configured) return
  try {
    const { useAuthStore } = await import('@/stores/auth')
    auth.value = useAuthStore()
    if (!auth.value.user) await auth.value.initializeAuth()
  } catch {
    loginError.value = '登入服務暫時無法連線，仍可查看行程。'
  }
})
function signIn() {
  auth.value?.openAuthModal('login', ICELAND_FLIGHTS_PATH)
}
</script>

<template>
  <CompanionJourney v-if="signedIn" />
  <TripReader v-else :section="typeof route.query.section === 'string' ? route.query.section : undefined" @select-section="router.replace({ query: { ...route.query, section: $event } })">
    <template #header-actions>
      <button v-if="configured" type="button" class="min-h-11 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 disabled:opacity-50" :disabled="!auth" @click="signIn">登入</button>
    </template>
    <template #header-notice><p v-if="loginError" role="status" class="text-xs text-stone-500">{{ loginError }}</p></template>
  </TripReader>
</template>
