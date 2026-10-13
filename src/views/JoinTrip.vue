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
  <div class="min-h-screen flex items-center justify-center p-8 bg-[#020617] mesh-gradient-dark text-white selection:bg-primary-500/30">
    <div class="w-full max-w-lg bg-secondary-900/40 backdrop-blur-3xl p-12 rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5 animate-fade-in group">
      <div class="text-center mb-12">
        <div class="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner group-hover:scale-110 transition-transform duration-700">🎟️</div>
        <h2 class="text-4xl font-black text-white tracking-tighter uppercase mb-3">Join Mission</h2>
        <p class="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">Enter the orbital access code shared by your team</p>
      </div>

      <div v-if="error" class="mb-8 p-6 rounded-[2rem] bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] border border-red-500/20 flex items-center gap-4 animate-slide-up">
        <span class="text-xl">⚠️</span> {{ error }}
      </div>

      <form @submit.prevent="handleJoin" class="space-y-10">
        <div class="space-y-4">
          <label for="code" class="block text-xs font-black text-white/30 uppercase tracking-[0.5em] ml-1">Access Protocol</label>
          <div class="relative group/input">
            <input id="code" type="text" required v-model="inviteCode"
              class="block w-full rounded-2xl border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 p-6 border transition-all outline-none font-mono tracking-[0.8em] text-center text-2xl uppercase placeholder:text-white/10"
              placeholder="XXXXXXX" />
            <div class="absolute inset-x-0 -bottom-1 h-1 bg-gradient-to-r from-transparent via-primary-500/30 to-transparent scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-700"></div>
          </div>
        </div>

        <div class="flex flex-col gap-5 pt-4">
          <button type="submit" :disabled="loading"
            class="flex w-full justify-center rounded-3xl bg-white text-secondary-900 py-6 px-4 text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-primary-400 hover:text-white hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50">
            {{ loading ? 'Authenticating...' : 'Establish Connection' }}
          </button>

          <router-link to="/trips"
            class="flex w-full justify-center rounded-3xl border border-white/10 bg-white/5 py-6 px-4 text-[10px] font-black uppercase tracking-[0.4em] text-white/40 hover:bg-white/10 hover:text-white transition-all active:scale-95">
            Abort Mission
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>
