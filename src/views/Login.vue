<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { ref } from 'vue'

const email = ref('')
const loading = ref(false)
const message = ref('')
const authStore = useAuthStore()

async function handleEmailLogin() {
  try {
    loading.value = true
    message.value = ''
    await authStore.signInWithEmail(email.value)
    message.value = 'Magic link sent! Check your email.'
  } catch (e: any) {
    message.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleOAuthLogin(provider: 'google' | 'line' | 'facebook') {
  try {
    await authStore.signInWithOAuth(provider)
  } catch (e: any) {
    message.value = e.message
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center p-4">
    <div class="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">歡迎回來</h2>
        <p class="mt-2 text-gray-600">登入您的帳號</p>
      </div>

      <div v-if="message" class="p-4 rounded-md bg-blue-50 text-blue-700 text-sm">
        {{ message }}
      </div>

      <!-- Email Login -->
      <form @submit.prevent="handleEmailLogin" class="space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">電子郵件</label>
          <div class="mt-1">
            <input id="email" name="email" type="email" autocomplete="email" required v-model="email"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
              placeholder="you@example.com" />
          </div>
        </div>

        <button type="submit" :disabled="loading"
          class="flex w-full justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50">
          {{ loading ? '傳送中...' : '傳送魔術連結' }}
        </button>
      </form>

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="bg-white px-2 text-gray-500">或使用以下方式登入</span>
        </div>
      </div>

      <!-- Social Login -->
      <div class="grid grid-cols-1 gap-3">
        <button @click="handleOAuthLogin('google')"
          class="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
          使用 Google 登入
        </button>
        <button @click="handleOAuthLogin('line')"
          class="flex w-full items-center justify-center rounded-md border border-gray-300 bg-[#00C300] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-[#00B300] focus:outline-none focus:ring-2 focus:ring-[#00C300] focus:ring-offset-2">
          使用 LINE 登入
        </button>
      </div>
    </div>
  </div>
</template>
