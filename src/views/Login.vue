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
  <div class="relative flex min-h-screen flex-col items-center justify-center p-8 bg-[#020617] mesh-gradient-dark text-white selection:bg-primary-500/30 overflow-hidden font-sans">
    <!-- Orbital Decor -->
    <div class="absolute top-1/4 -left-40 w-[40rem] h-[40rem] bg-primary-500/10 blur-[150px] rounded-full animate-pulse-slow"></div>
    <div class="absolute bottom-1/4 -right-40 w-[35rem] h-[35rem] bg-indigo-500/10 blur-[150px] rounded-full animate-pulse-slow [animation-delay:2000ms]"></div>
    
    <div class="w-full max-w-lg relative z-10 animate-fade-in-up">
      <div class="text-center mb-12">
        <div class="inline-flex items-center justify-center w-24 h-24 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl mb-8 group hover:scale-110 transition-transform duration-700">
           <img src="@/assets/img/TravelMate.png" alt="TravelMate" class="h-10 w-auto brightness-0 invert group-hover:rotate-12 transition-transform" />
        </div>
        <h2 class="text-6xl font-black text-white tracking-tighter uppercase mb-4">Identity Check</h2>
        <p class="text-[11px] text-white/30 font-black uppercase tracking-[0.5em]">Authorization Required · System v1.0</p>
      </div>

      <div class="bg-secondary-900/40 backdrop-blur-3xl p-12 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5 space-y-10">
        <div v-if="message" class="p-6 rounded-3xl bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-black uppercase tracking-widest leading-relaxed flex items-center gap-4 animate-slide-up">
           <div class="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
           {{ message }}
        </div>

        <!-- Email Authentication -->
        <form @submit.prevent="handleEmailLogin" class="space-y-8">
          <div class="space-y-4">
            <label for="email" class="block text-[10px] font-black uppercase tracking-[0.6em] text-white/20 ml-2">Communications Channel</label>
            <div class="relative group">
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autocomplete="email" 
                  required 
                  v-model="email"
                  class="block w-full rounded-2xl border-white/10 bg-white/5 text-white text-base focus:bg-white/10 focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 p-6 border transition-all outline-none font-bold placeholder:text-white/10"
                  placeholder="agent.zero@travelmate.io" 
                />
                <div class="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-primary-500/50 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-700"></div>
            </div>
          </div>

          <button 
            type="submit" 
            :disabled="loading"
            class="group relative w-full overflow-hidden rounded-3xl bg-white text-secondary-900 py-6 text-[10px] font-black uppercase tracking-[0.5em] shadow-2xl hover:bg-primary-500 hover:text-white hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50"
          >
            <span class="relative z-10">{{ loading ? 'Establishing Link...' : 'Request Magic Key' }}</span>
            <div class="absolute inset-0 bg-primary-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          </button>
        </form>

        <div class="relative py-4">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-white/5"></div>
          </div>
          <div class="relative flex justify-center">
            <span class="bg-secondary-900/60 backdrop-blur-2xl px-6 rounded-full border border-white/5 text-[9px] font-black uppercase tracking-[0.4em] text-white/20">External Handshake</span>
          </div>
        </div>

        <!-- Biometric / Social Connect -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button @click="handleOAuthLogin('google')"
            class="flex items-center justify-center gap-4 rounded-3xl bg-white/5 border border-white/5 py-5 px-6 text-[10px] font-black text-white/40 uppercase tracking-widest hover:bg-white/10 hover:border-white/20 hover:text-white transition-all active:scale-95 group">
            <img src="https://www.google.com/favicon.ico" class="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
            Google
          </button>
          <button @click="handleOAuthLogin('line')"
            class="flex items-center justify-center gap-4 rounded-3xl bg-[#00C300]/10 border border-[#00C300]/20 py-5 px-6 text-[10px] font-black text-[#00C300] uppercase tracking-widest hover:bg-[#00C300]/20 hover:border-[#00C300]/30 transition-all active:scale-95">
            <div class="w-4 h-4 bg-[#00C300] rounded-sm"></div>
            LINE Core
          </button>
        </div>

        <div class="pt-6 text-center">
          <router-link to="/register" class="text-[10px] font-black uppercase tracking-[0.6em] text-white/20 hover:text-primary-400 transition-all">
            New Directive? <span class="text-white">Create Account</span>
          </router-link>
        </div>
      </div>
    </div>
    
    <div class="fixed bottom-12 text-[8px] font-black text-white/10 uppercase tracking-[1em] pointer-events-none">
        Encryption Level : Quantum-Safe (AES-256)
    </div>
  </div>
</template>

<style scoped>
.animate-pulse-slow {
    animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.1; transform: scale(1); }
    50% { opacity: 0.3; transform: scale(1.1); }
}

.animate-fade-in-up {
    animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-slide-up {
    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
