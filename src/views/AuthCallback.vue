<script setup lang="ts">
import { supabase } from '@/services/supabase'
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

  onMounted(async () => {
    // Retrieve session; with detectSessionInUrl enabled, this will parse the URL hash
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error during auth callback:', error);
      router.push('/login');
      return;
    }
    // Session is now stored; proceed with redirect
    const nextRoute = route.query.next as string;
    const redirectPath = nextRoute || authStore.redirectAfterLogin || '/trips';
    authStore.closeAuthModal();
    // Clean up URL hash to avoid showing token
    router.replace(redirectPath);
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
