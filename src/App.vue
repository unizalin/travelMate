<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import '@/styles/globals.css'

const route = useRoute()
const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const GlobalUIContainer = defineAsyncComponent(() => import('@/components/common/GlobalUIContainer.vue'))
const showMobileNavigation = computed(() => !route.matched.some(record => record.meta.publicReader || record.meta.hideMobileTab))

useTheme()

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
  <div class="min-h-screen mesh-gradient text-secondary-900 dark:mesh-gradient-dark dark:text-secondary-100 transition-colors duration-200" :class="showMobileNavigation ? 'pb-24 lg:pb-0' : ''">
    <RouterView />
    <MobileTabBar v-if="showMobileNavigation" />
    <GlobalUIContainer v-if="supabaseConfigured" />
  </div>
</template>

