<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import '@/styles/globals.css'

const route = useRoute()
const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const GlobalUIContainer = defineAsyncComponent(() => import('@/components/common/GlobalUIContainer.vue'))
const showMobileNavigation = computed(() => !route.matched.some(record => record.meta.publicReader || record.meta.hideMobileTab))

document.documentElement.classList.remove('dark')
document.documentElement.style.colorScheme = 'light'

onMounted(async () => {
  if (!supabaseConfigured) return
  try {
    const { useAuthStore } = await import('@/stores/auth')
    await useAuthStore().initializeAuth()
  } catch (error) {
    console.warn('Authentication is unavailable for this session.', error)
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#F7F8F6] text-[#263331]" :class="showMobileNavigation ? 'pb-24 lg:pb-0' : ''">
    <p v-if="!route.matched.length" class="mx-auto max-w-2xl px-5 py-16 text-center text-sm text-slate-600" role="status">正在載入旅程…</p>
    <RouterView />
    <MobileTabBar v-if="showMobileNavigation" />
    <GlobalUIContainer v-if="supabaseConfigured" />
  </div>
</template>

