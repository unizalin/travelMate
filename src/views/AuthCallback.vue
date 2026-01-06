<script setup lang="ts">
import { supabase } from '@/lib/supabase'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(async () => {
  const { error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error during auth callback:', error)
    router.push('/login')
  } else {
    router.push('/')
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
