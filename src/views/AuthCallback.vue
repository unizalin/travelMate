<script setup lang="ts">
import { supabase } from '@/services/supabase'
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const errorMessage = ref<string | null>(null)

onMounted(async () => {
  try {
    // Check for error in URL params (OAuth errors)
    const errorParam = route.query.error
    const errorDescription = route.query.error_description as string
    
    if (errorParam) {
      console.error('OAuth error:', errorParam, errorDescription)
      errorMessage.value = errorDescription || '登入過程發生錯誤'
      setTimeout(() => {
        router.push('/login')
      }, 3000)
      return
    }

    // Handle OAuth callback - this will parse the hash fragment
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error during auth callback:', error)
      errorMessage.value = error.message || '驗證失敗，請重試'
      setTimeout(() => {
        router.push('/login')
      }, 3000)
      return
    }

    // Verify we have a valid session
    if (!data.session) {
      console.error('No session found after OAuth callback')
      errorMessage.value = '無法建立登入會話，請重試'
      setTimeout(() => {
        router.push('/login')
      }, 3000)
      return
    }

    // Wait a bit for auth state to propagate
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Session is now stored; proceed with redirect
    const nextRoute = route.query.next as string
    const redirectPath = nextRoute || authStore.redirectAfterLogin || '/trips'
    authStore.closeAuthModal()
    
    // Clean up URL hash and redirect
    router.replace(redirectPath)
  } catch (err: any) {
    console.error('Unexpected error in auth callback:', err)
    errorMessage.value = '發生未預期的錯誤'
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-50">
    <div class="text-center p-8">
      <div v-if="!errorMessage" class="space-y-4">
        <!-- Loading Spinner -->
        <div class="flex justify-center">
          <div class="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
        <h2 class="text-2xl font-black text-secondary-900">驗證登入中...</h2>
        <p class="text-sm font-bold text-secondary-500">請稍候，我們正在為您完成登入</p>
      </div>
      
      <div v-else class="space-y-4">
        <!-- Error Icon -->
        <div class="flex justify-center">
          <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
        </div>
        <h2 class="text-2xl font-black text-red-600">登入失敗</h2>
        <p class="text-sm font-bold text-secondary-600 max-w-md">{{ errorMessage }}</p>
        <p class="text-xs text-secondary-400">即將返回登入頁面...</p>
      </div>
    </div>
  </div>
</template>
