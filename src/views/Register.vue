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
          display_name: fullName.value,
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
  <div class="relative flex min-h-screen flex-col items-center justify-center p-8 bg-[#020617] mesh-gradient-dark text-white selection:bg-primary-500/30 overflow-hidden font-sans">
    <!-- Orbital Decor -->
    <div class="absolute -top-40 -right-40 w-[50rem] h-[50rem] bg-indigo-500/10 blur-[150px] rounded-full animate-pulse-slow"></div>
    <div class="absolute -bottom-40 -left-40 w-[45rem] h-[45rem] bg-primary-500/10 blur-[150px] rounded-full animate-pulse-slow [animation-delay:2000ms]"></div>

    <div class="w-full max-w-lg relative z-10 animate-fade-in-up">
      <div class="text-center mb-12">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-white/5 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-2xl mb-8 group hover:scale-110 transition-transform duration-700">
           <img src="@/assets/img/TravelMate.png" alt="TravelMate" class="h-8 w-auto brightness-0 invert group-hover:-rotate-12 transition-transform" />
        </div>
        <h2 class="text-5xl font-black text-white tracking-tighter uppercase mb-4">Commission Agent</h2>
        <p class="text-[11px] text-white/30 font-black uppercase tracking-[0.5em]">Establishing New Protocol Trace</p>
      </div>

      <div class="bg-secondary-900/40 backdrop-blur-3xl p-10 md:p-12 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5 space-y-8">
        <div v-if="message" class="p-6 rounded-3xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-black uppercase tracking-widest leading-relaxed flex items-center gap-4 animate-slide-up">
           <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           {{ message }}
        </div>

        <div v-if="error" class="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest leading-relaxed flex items-center gap-4 animate-slide-up">
           <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
           {{ error }}
        </div>

        <form @submit.prevent="handleRegister" class="space-y-6">
          <div class="space-y-4">
            <label for="name" class="block text-[10px] font-black uppercase tracking-[0.5em] text-white/20 ml-2">Agent Designation</label>
            <input id="name" type="text" required v-model="fullName" placeholder="Agent Maverick" 
              class="block w-full rounded-2xl border-white/10 bg-white/5 text-white text-base focus:bg-white/10 focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 p-5 border transition-all outline-none font-bold placeholder:text-white/10" />
          </div>

          <div class="space-y-4">
            <label for="email" class="block text-[10px] font-black uppercase tracking-[0.5em] text-white/20 ml-2">Comm-Link Channel</label>
            <input id="email" type="email" required v-model="email" placeholder="maverick@travelmate.io" 
              class="block w-full rounded-2xl border-white/10 bg-white/5 text-white text-base focus:bg-white/10 focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 p-5 border transition-all outline-none font-bold placeholder:text-white/10" />
          </div>

          <div class="space-y-4">
            <label for="password" class="block text-[10px] font-black uppercase tracking-[0.5em] text-white/20 ml-2">Encryption Key</label>
            <input id="password" type="password" required v-model="password" placeholder="••••••••" 
              class="block w-full rounded-2xl border-white/10 bg-white/5 text-white text-base focus:bg-white/10 focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 p-5 border transition-all outline-none font-bold placeholder:text-white/10" />
          </div>

          <button type="submit" :disabled="loading"
            class="group relative w-full overflow-hidden rounded-3xl bg-white text-secondary-900 py-6 text-[10px] font-black uppercase tracking-[0.5em] shadow-2xl hover:bg-primary-500 hover:text-white hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50">
            <span class="relative z-10">{{ loading ? 'Deploying...' : 'Deploy Protocol' }}</span>
            <div class="absolute inset-0 bg-primary-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          </button>
        </form>

        <div class="relative py-2">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-white/5"></div>
          </div>
          <div class="relative flex justify-center">
            <span class="bg-secondary-900/60 backdrop-blur-2xl px-6 rounded-full border border-white/5 text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Sync Integration</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button @click="handleOAuthLogin('google')"
            class="flex items-center justify-center gap-4 rounded-3xl bg-white/5 border border-white/5 py-5 px-6 text-[10px] font-black text-white/40 uppercase tracking-widest hover:bg-white/10 hover:border-white/20 hover:text-white transition-all active:scale-95 group">
            <img src="https://www.google.com/favicon.ico" class="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
            Google
          </button>
          <button @click="handleOAuthLogin('line')"
            class="flex items-center justify-center gap-4 rounded-3xl bg-[#00C300]/10 border border-[#00C300]/20 py-5 px-6 text-[10px] font-black text-[#00C300] uppercase tracking-widest hover:bg-[#00C300]/20 hover:border-[#00C300]/30 transition-all active:scale-95">
            <div class="w-4 h-4 bg-[#00C300] rounded-sm"></div>
            LINE Sync
          </button>
        </div>

        <div class="pt-6 text-center">
          <router-link to="/login" class="text-[10px] font-black uppercase tracking-[0.6em] text-white/20 hover:text-primary-400 transition-all">
            Authorized Already? <span class="text-white">Access Portal</span>
          </router-link>
        </div>
      </div>
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
