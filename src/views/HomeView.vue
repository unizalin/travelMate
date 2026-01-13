<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const router = useRouter()

function handleLogout() {
  authStore.signOut()
}

function goToTrips() {
  router.push('/trips')
}
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center p-24 text-center">
    <h1 class="text-4xl font-bold text-primary-600">TravelMate</h1>
    <p class="mt-4 text-xl text-slate-600">Your collaborative travel planner</p>

    <div class="mt-8">
      <div v-if="user" class="space-y-4">
        <p>Welcome back, {{ user.email }}</p>
        <div class="space-x-4">
          <button @click="goToTrips" class="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">
            Go to My Trips
          </button>
          <button @click="handleLogout" class="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
            Logout
          </button>
        </div>
      </div>
      <div v-else class="space-x-4">
        <button 
          @click="authStore.openAuthModal('login')" 
          class="rounded-2xl bg-secondary-900 px-8 py-3 text-sm font-black text-white hover:bg-black transition-all active:scale-95 uppercase tracking-widest"
        >
          登入
        </button>
        <button 
          @click="authStore.openAuthModal('register')"
          class="rounded-2xl bg-white px-8 py-3 text-sm font-black text-secondary-900 border-2 border-secondary-900 hover:bg-secondary-50 transition-all active:scale-95 uppercase tracking-widest"
        >
          註冊
        </button>
      </div>
    </div>
  </main>
</template>
