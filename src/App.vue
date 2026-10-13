<script setup lang="ts">
import { RouterView } from 'vue-router'
import GlobalUIContainer from '@/components/common/GlobalUIContainer.vue'
import { useAuthStore } from '@/stores/auth'
import { onMounted } from 'vue'

import { useTheme } from '@/composables/useTheme'
import '@/styles/globals.css'

import MobileTabBar from '@/components/common/MobileTabBar.vue'

const authStore = useAuthStore()
useTheme() // Initialize theme system

onMounted(() => {
  authStore.initializeAuth()
})
</script>

<template>
  <div class="min-h-screen pb-24 lg:pb-0 mesh-gradient dark:mesh-gradient-dark text-secondary-900 dark:text-secondary-100 transition-colors duration-200">
    <RouterView />
    <MobileTabBar />
    <GlobalUIContainer />
  </div>
</template>

