<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { profileService } from '@/services/profileService'
import { UserCircleIcon, CameraIcon, ArrowLeftIcon, SwatchIcon } from '@heroicons/vue/24/outline'
import { useTheme } from '@/composables/useTheme'

const authStore = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const error = ref('')

const displayName = ref('')
const avatarUrl = ref('')

const { theme, setTheme } = useTheme()
const themeOptions = [
  { 
    label: '淺色模式', 
    value: 'light',
    preview: 'bg-white'
  },
  { 
    label: '深色模式', 
    value: 'dark',
    preview: 'bg-secondary-900'
  },
  { 
    label: '跟隨系統', 
    value: 'system',
    preview: 'bg-gradient-to-br from-white via-white to-secondary-900'
  }
] as const

onMounted(async () => {
  if (!authStore.user) return

  try {
    loading.value = true
    const profile = await profileService.getProfile(authStore.user.id)
    if (profile) {
      displayName.value = profile.display_name || ''
      avatarUrl.value = profile.avatar_url || ''
    } else {
        // Fallback to auth metadata if profile doesn't exist yet
        displayName.value = authStore.user.user_metadata.display_name || authStore.user.user_metadata.full_name || ''
        avatarUrl.value = authStore.user.user_metadata.avatar_url || ''
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function updateProfile() {
  if (!authStore.user) return

  try {
    saving.value = true
    message.value = ''
    error.value = ''

    await profileService.updateProfile(authStore.user.id, {
      display_name: displayName.value,
    })

    message.value = '個人資料更新成功'
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

function getProviderIcon(provider: string) {
    const identities = authStore.user?.identities || []
    return identities.some(id => id.provider === provider)
}
</script>

<template>
  <div class="min-h-screen bg-[#020617] mesh-gradient-dark text-white selection:bg-primary-500/30 transition-all duration-500 font-sans">
    <!-- Header -->
    <header class="sticky top-0 z-40 bg-secondary-900/40 backdrop-blur-3xl border-b border-white/10 shadow-2xl ring-1 ring-white/5">
      <div class="mx-auto max-w-4xl px-8 py-6">
         <div class="flex items-center gap-6">
            <router-link to="/trips" class="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-90 border border-white/10 text-white/40 hover:text-white">
                <ArrowLeftIcon class="h-6 w-6" />
            </router-link>
            <div class="group">
                <h1 class="text-2xl font-black tracking-tight text-white group-hover:text-primary-400 transition-colors">Mission Settings</h1>
                <p class="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] mt-1 group-hover:text-white/60 transition-colors">System Configuration · User ID: {{ authStore.user?.id.slice(0, 8) }}</p>
            </div>
         </div>
      </div>
    </header>

    <main class="py-12 animate-fade-in" v-if="!loading">
      <div class="mx-auto max-w-4xl px-8 space-y-8">
        
        <!-- Profile Card -->
        <div class="bg-secondary-900/40 backdrop-blur-3xl rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden ring-1 ring-white/5 group hover:border-primary-500/30 transition-all duration-700">
            <div class="p-10 md:p-12 flex flex-col md:flex-row items-center gap-10">
                <!-- Avatar -->
                <div class="relative">
                    <div class="h-32 w-32 rounded-[3.5rem] bg-white/5 ring-8 ring-[#020617]/50 shadow-2xl overflow-hidden active:scale-95 transition-transform">
                        <img v-if="avatarUrl || authStore.user?.user_metadata?.avatar_url" 
                             :src="avatarUrl || authStore.user?.user_metadata?.avatar_url" 
                             alt="Avatar" class="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div v-else class="h-full w-full flex items-center justify-center bg-primary-500/10 text-primary-400">
                            <UserCircleIcon class="h-20 w-20" />
                        </div>
                    </div>
                    <button class="absolute -bottom-2 -right-2 bg-primary-500 p-4 rounded-3xl shadow-2xl shadow-primary-500/30 border border-primary-400 hover:scale-110 active:scale-90 transition-all">
                        <CameraIcon class="h-5 w-5 text-white" />
                    </button>
                </div>
                
                <!-- Info -->
                <div class="text-center md:text-left flex-1 space-y-4">
                    <h2 class="text-4xl font-black text-white tracking-tighter tabular-nums uppercase">{{ displayName || 'Mission Pilot' }}</h2>
                    <p class="text-[10px] text-white/30 font-black uppercase tracking-[0.4em]">{{ authStore.user?.email }}</p>
                    <div class="pt-4 flex flex-wrap justify-center md:justify-start gap-3">
                         <!-- Account Source Badges -->
                         <span v-if="getProviderIcon('google')" class="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 hover:border-white/20 transition-all">
                             <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Google Auth
                         </span>
                         <span v-if="getProviderIcon('line')" class="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 hover:border-white/20 transition-all">
                             <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> LINE Connect
                         </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Appearance Settings -->
        <div class="bg-secondary-900/40 backdrop-blur-3xl rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden ring-1 ring-white/5">
             <div class="px-10 py-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <SwatchIcon class="h-5 w-5 text-primary-400" />
                    <h3 class="text-xs font-black text-white uppercase tracking-[0.3em]">Neural Aesthetic</h3>
                </div>
                <div class="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Visual Overhaul</div>
             </div>
             <div class="p-10 md:p-12 space-y-10">
                <div class="space-y-6">
                    <label class="block text-xs font-black text-white/30 uppercase tracking-[0.5em] ml-1">Interface Mode</label>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <button 
                            v-for="opt in themeOptions" 
                            :key="opt.value"
                            @click="setTheme(opt.value)"
                            :class="[
                                'relative group overflow-hidden rounded-[2.5rem] border-2 transition-all duration-700 text-left p-6',
                                theme === opt.value 
                                    ? 'border-primary-500 bg-primary-500/10 shadow-[0_30px_60px_rgba(79,70,229,0.2)]' 
                                    : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                            ]"
                        >
                            <div :class="['h-24 w-full rounded-3xl mb-6 border border-white/10 shadow-inner transition-transform duration-700 group-hover:scale-[1.05]', opt.preview]">
                                <div class="p-4 space-y-3">
                                    <div class="h-2 w-16 rounded-full" :class="opt.value === 'dark' ? 'bg-white/20' : 'bg-secondary-200'"></div>
                                    <div class="h-2 w-10 rounded-full" :class="opt.value === 'dark' ? 'bg-white/10' : 'bg-secondary-100'"></div>
                                </div>
                            </div>

                            <div class="space-y-1 text-center">
                                <p class="text-xs font-black uppercase tracking-[0.3em] transition-colors" :class="theme === opt.value ? 'text-primary-400' : 'text-white/40 group-hover:text-white/60'">
                                    {{ opt.label }}
                                </p>
                            </div>

                            <!-- Selected Indicator -->
                            <div v-if="theme === opt.value" class="absolute top-4 right-4">
                                <div class="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center shadow-2xl shadow-primary-500/40">
                                    <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
             </div>
        </div>

        <!-- Settings Form -->
        <div class="bg-secondary-900/40 backdrop-blur-3xl rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden ring-1 ring-white/5">
             <div class="px-10 py-6 border-b border-white/5 bg-white/5">
                <h3 class="text-xs font-black text-white uppercase tracking-[0.3em]">Core Identity</h3>
             </div>
             
             <div class="p-10 md:p-12">
                 <form @submit.prevent="updateProfile" class="space-y-10">
                    <div class="grid grid-cols-1 gap-8">
                        <div class="space-y-4">
                            <label for="displayName" class="block text-xs font-black text-white/30 uppercase tracking-[0.5em] ml-1">Designation</label>
                            <input
                                id="displayName"
                                type="text"
                                v-model="displayName"
                                class="block w-full rounded-2xl border-white/10 bg-white/5 text-white text-base focus:bg-white/10 focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 p-5 border transition-all outline-none font-bold placeholder:text-white/20 tracking-tight"
                                placeholder="Enter designation..."
                            />
                        </div>

                        <div class="space-y-4">
                            <label class="block text-xs font-black text-white/30 uppercase tracking-[0.5em] ml-1">Comms Channel</label>
                            <div class="block w-full rounded-2xl border border-white/5 bg-white/5 text-white/40 text-base p-5 font-bold flex items-center justify-between">
                                <span>{{ authStore.user?.email }}</span>
                                <span class="text-[9px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-white/20 uppercase tracking-widest">Locked Profile</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="message" class="rounded-[2rem] bg-primary-500/10 p-6 text-primary-400 text-xs font-black uppercase tracking-[0.2em] border border-primary-500/20 flex items-center gap-4 animate-slide-up">
                        <span class="text-xl">⚡</span> {{ message }}
                    </div>

                    <div v-if="error" class="rounded-[2rem] bg-red-500/10 p-6 text-red-400 text-xs font-black uppercase tracking-[0.2em] border border-red-500/20 flex items-center gap-4 animate-slide-up">
                        <span class="text-xl">⚠️</span> {{ error }}
                    </div>

                    <div class="pt-6 flex items-center justify-end gap-6">
                        <button
                            type="submit"
                            :disabled="saving"
                            class="rounded-3xl bg-white text-secondary-900 px-12 py-5 text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-primary-400 hover:text-white hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50"
                        >
                            {{ saving ? 'Syncing...' : 'Sync Changes' }}
                        </button>
                    </div>
                </form>
             </div>
        </div>

        <!-- Danger Zone -->
        <div class="flex flex-col items-center gap-10 pt-12">
             <button
                type="button"
                @click="authStore.signOut()"
                class="text-[10px] font-black text-red-500 hover:text-white hover:bg-red-500/20 bg-red-500/5 border border-red-500/10 px-12 py-5 rounded-3xl uppercase tracking-[0.4em] transition-all active:scale-95 shadow-2xl"
            >
                Terminate Session
             </button>
             <p class="text-[9px] font-black text-white/10 uppercase tracking-[0.6em]">TravelMate Protocol v1.0.0-PRO-MAX</p>
        </div>
      </div>
    </main>
    <div v-else class="h-screen flex items-center justify-center">
        <div class="text-xs font-black uppercase tracking-[0.5em] animate-pulse text-primary-400">Decrypting Profile Data...</div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-slide-up {
    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
</style>
