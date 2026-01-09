<script setup lang="ts">
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const fullName = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')
const router = useRouter()
const authStore = useAuthStore()

async function handleOAuthLogin(provider: 'google' | 'line' | 'facebook') {
  try {
    await authStore.signInWithOAuth(provider)
  } catch (e: any) {
    error.value = e.message
  }
}

async function handleRegister() {
  try {
    loading.value = true
    message.value = ''
    error.value = ''

    // 1. Sign up with email
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          full_name: fullName.value,
        },
      },
    })

    if (signUpError) throw signUpError

    if (data.session) {
      router.push('/')
    } else {
      message.value = '註冊成功！請檢查您的電子郵件以進行確認。'
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center p-4">
    <div class="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">建立帳號</h2>
      </div>

      <div v-if="message" class="p-4 rounded-md bg-green-50 text-green-700 text-sm">
        {{ message }}
      </div>

      <div v-if="error" class="p-4 rounded-md bg-red-50 text-red-700 text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="handleRegister" class="space-y-6">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">全名</label>
          <div class="mt-1">
            <input id="name" type="text" required v-model="fullName"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
          </div>
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">電子郵件</label>
          <div class="mt-1">
            <input id="email" type="email" required v-model="email"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
          </div>
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">密碼</label>
          <div class="mt-1">
            <input id="password" type="password" required v-model="password"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
          </div>
        </div>

        <button type="submit" :disabled="loading"
          class="flex w-full justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50">
          {{ loading ? '建立帳號中...' : '註冊' }}
        </button>
      </form>

      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="bg-white px-2 text-gray-500">或使用以下方式註冊</span>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-3">
          <button @click="handleOAuthLogin('google')"
            class="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
            使用 Google 註冊
          </button>
          <button @click="handleOAuthLogin('line')"
            class="flex w-full items-center justify-center rounded-md border border-gray-300 bg-[#00C300] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-[#00B300] focus:outline-none focus:ring-2 focus:ring-[#00C300] focus:ring-offset-2">
            使用 LINE 註冊
          </button>
        </div>
      </div>

      <div class="mt-6 text-center text-sm">
        <router-link to="/login" class="font-medium text-primary-600 hover:text-primary-500">
          已經有帳號了？登入
        </router-link>
      </div>
    </div>
  </div>
</template>
