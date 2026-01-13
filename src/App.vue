<script setup lang="ts">
import { RouterView } from 'vue-router'
import GlobalUIContainer from '@/components/common/GlobalUIContainer.vue'
import { useAuthStore } from '@/stores/auth'
import { onMounted } from 'vue'

const authStore = useAuthStore()

onMounted(() => {
  authStore.initializeAuth()
})
</script>

<template>
  <div class="font-body text-secondary-900 antialiased">
    <RouterView />
    <GlobalUIContainer />
  </div>
</template>
