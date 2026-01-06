<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useTripStore } from '@/stores/trip'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const inviteCode = ref('')
const loading = ref(false)
const error = ref('')
const tripStore = useTripStore()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const router = useRouter()

async function handleJoin() {
  if (!user.value) return
  if (!inviteCode.value) return

  try {
    loading.value = true
    error.value = ''
    const tripId = await tripStore.joinTrip(inviteCode.value, user.value.id)
    router.push(`/trips/${tripId}`)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
    <div class="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">Join a Trip</h2>
        <p class="mt-2 text-gray-600">Enter the invite code shared with you</p>
      </div>

      <div v-if="error" class="p-4 rounded-md bg-red-50 text-red-700 text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="handleJoin" class="space-y-6">
        <div>
          <label for="code" class="block text-sm font-medium text-gray-700">Invite Code</label>
          <div class="mt-1">
            <input id="code" type="text" required v-model="inviteCode"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border font-mono tracking-widest text-center text-lg uppercase"
              placeholder="XXXXXXX" />
          </div>
        </div>

        <div class="flex flex-col space-y-3">
          <button type="submit" :disabled="loading"
            class="flex w-full justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50">
            {{ loading ? 'Joining...' : 'Join Trip' }}
          </button>

          <router-link to="/trips"
            class="flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
            Cancel
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>
