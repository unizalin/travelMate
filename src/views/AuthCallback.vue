<script setup lang="ts">
import { supabase } from '@/services/supabase'
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

onMounted(async () => {
  const { error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error during auth callback:', error)
    router.push('/login')
  } else {
    // Check for 'next' parameter in the URL
    const nextRoute = route.query.next as string
    const redirectPath = nextRoute || authStore.redirectAfterLogin || '/trips'
    
    authStore.closeAuthModal() // Just in case
    router.push(redirectPath)
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <h2 class="text-xl font-semibold">Verifying authentication...</h2>
      <p class="text-gray-500">Please wait while we redirect you.</p>
    </div>
  </div>
</template>
