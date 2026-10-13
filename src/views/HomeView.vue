<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { MapIcon, UserGroupIcon, GlobeAsiaAustraliaIcon } from '@heroicons/vue/24/outline'

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
  <div class="relative min-h-screen bg-[#020617] mesh-gradient-dark overflow-x-hidden selection:bg-primary-500/30 font-sans">
    <!-- Navigation Overlay -->
    <nav class="absolute top-0 left-0 right-0 z-50 p-8 sm:p-10 pointer-events-none">
        <div class="max-w-7xl mx-auto flex justify-between items-center pointer-events-auto">
            <div class="flex items-center gap-4 group cursor-pointer">
                <div class="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-xl shadow-2xl shadow-primary-500/20 group-hover:rotate-12 transition-transform">🧭</div>
                <span class="text-2xl font-black tracking-tighter text-white">TravelMate</span>
            </div>
            <div class="flex items-center gap-4 md:gap-8 bg-secondary-900/40 backdrop-blur-2xl px-8 py-3 rounded-2xl border border-white/5 shadow-2xl">
                <template v-if="user">
                    <button @click="goToTrips" class="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors">Mission Center</button>
                    <div class="w-[1px] h-3 bg-white/10"></div>
                    <button @click="handleLogout" class="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/70 hover:text-red-400 transition-colors">Abort</button>
                </template>
                <template v-else>
                    <button @click="authStore.openAuthModal('login')" class="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors">Access</button>
                    <button @click="authStore.openAuthModal('register')" class="px-6 py-2 bg-primary-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all">Onboard</button>
                </template>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="relative min-h-screen flex items-center justify-center pt-20">
      <div class="absolute inset-0 z-0">
        <div class="relative w-full h-full overflow-hidden">
          <img 
            src="/assets/images/hero.png" 
            class="w-full h-full object-cover scale-110 animate-subtle-zoom opacity-30 blur-[2px]"
            alt="Space Hero"
          />
          <div class="absolute inset-0 bg-gradient-to-b from-[#020617]/0 via-[#020617]/40 to-[#020617]"></div>
          <!-- Ambient Light Particles -->
          <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px] animate-pulse"></div>
          <div class="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s]"></div>
        </div>
      </div>

      <!-- Hero Content -->
      <div class="relative z-20 text-center px-8 max-w-6xl mx-auto">
        <div class="inline-flex items-center gap-4 px-8 py-3 rounded-full bg-white/5 backdrop-blur-3xl border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.5em] mb-12 animate-fade-in-up shadow-2xl">
          <span class="flex h-2 w-2 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
          </span>
          Next-Gen Orbital Planning Active
        </div>
        
        <h1 class="text-7xl md:text-[10rem] font-black text-white tracking-tighter leading-[0.85] mb-12 animate-fade-in-up [animation-delay:200ms] perspective-text select-none">
          Adventure<br/>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-secondary-300 to-primary-500">Waitless</span>
        </h1>
        
        <p class="text-lg md:text-2xl text-white/40 font-bold max-w-2xl mx-auto mb-16 animate-fade-in-up [animation-delay:400ms] leading-relaxed tracking-tight">
          Redefining travel through multi-agent collaboration, <span class="text-white/60">AI spatial analysis</span>, and the world's most intuitive itinerary architecture.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-8 animate-fade-in-up [animation-delay:600ms]">
          <template v-if="user">
            <button @click="goToTrips" class="group relative px-16 py-6 bg-white text-secondary-900 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] overflow-hidden transition-all duration-700 hover:scale-110 active:scale-95 shadow-[0_40px_100px_rgba(255,255,255,0.1)]">
              <span class="relative z-10 flex items-center gap-3">Initialize Mission Central <span class="text-xl group-hover:translate-x-2 transition-transform">→</span></span>
            </button>
          </template>
          <template v-else>
            <button @click="authStore.openAuthModal('register')" class="group relative px-16 py-6 bg-primary-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] overflow-hidden transition-all duration-700 hover:scale-110 active:scale-95 shadow-[0_40px_100px_rgba(37,99,235,0.25)] border border-primary-400/50">
              <span class="relative z-10">Deploy Protocol</span>
              <div class="absolute inset-x-0 bottom-0 h-0 group-hover:h-full bg-white/10 transition-all duration-700"></div>
            </button>
            <button @click="authStore.openAuthModal('login')" class="px-16 py-6 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] text-white/60 font-black uppercase tracking-[0.3em] text-[11px] hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-2xl">
              Restore Session
            </button>
          </template>
        </div>
      </div>

      <!-- Bottom Gradient Mask -->
      <div class="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-[#020617] to-transparent z-10"></div>
    </section>

    <!-- Features Section -->
    <section class="py-60 px-8 relative z-20">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col items-center text-center mb-32 space-y-6">
            <span class="text-[10px] font-black uppercase tracking-[1em] text-primary-500 py-2 px-6 bg-primary-500/5 rounded-full border border-primary-500/10">Intelligence Core</span>
            <h3 class="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none">
                Elite Spatial<br/><span class="text-primary-400 font-black">Engineering</span>
            </h3>
            <p class="max-w-xl text-white/30 font-bold text-lg">Every module is calibrated for performance and aesthetic dominance.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-12">
          <!-- Feature 1 -->
          <div class="group relative p-12 rounded-[4rem] bg-secondary-900/20 backdrop-blur-3xl border border-white/5 hover:border-primary-500/30 transition-all duration-1000 overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-[60px] group-hover:bg-primary-500/20 transition-all duration-1000"></div>
            <div class="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-primary-400 mb-12 ring-2 ring-white/5 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner">
              <UserGroupIcon class="w-10 h-10" />
            </div>
            <h4 class="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] mb-4">Neural Mesh</h4>
            <h5 class="text-4xl font-black text-white mb-8 tracking-tighter group-hover:text-primary-400 transition-colors">Swarm Sync</h5>
            <p class="text-white/40 leading-relaxed font-bold text-lg">
              Dynamic real-time synchronization between agents. No lag, no conflict, just total mission alignment.
            </p>
          </div>

          <!-- Feature 2 -->
          <div class="group relative p-12 rounded-[4rem] bg-secondary-900/20 backdrop-blur-3xl border border-white/5 hover:border-amber-500/30 transition-all duration-1000 overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[60px] group-hover:bg-amber-500/20 transition-all duration-1000"></div>
            <div class="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-amber-400 mb-12 ring-2 ring-white/5 group-hover:scale-110 group-hover:-rotate-6 transition-all shadow-inner">
              <GlobeAsiaAustraliaIcon class="w-10 h-10" />
            </div>
            <h4 class="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] mb-4">Gemini Layer</h4>
            <h5 class="text-4xl font-black text-white mb-8 tracking-tighter group-hover:text-amber-400 transition-colors">AI Core</h5>
            <p class="text-white/40 leading-relaxed font-bold text-lg">
              Powered by advanced LLMs to identify hidden routes and curated experiences tailored to your profile.
            </p>
          </div>

          <!-- Feature 3 -->
          <div class="group relative p-12 rounded-[4rem] bg-secondary-900/20 backdrop-blur-3xl border border-white/5 hover:border-indigo-500/30 transition-all duration-1000 overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px] group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
            <div class="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-indigo-400 mb-12 ring-2 ring-white/5 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner">
              <MapIcon class="w-10 h-10" />
            </div>
            <h4 class="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] mb-4">Vector Maps</h4>
            <h5 class="text-4xl font-black text-white mb-8 tracking-tighter group-hover:text-indigo-400 transition-colors">Trajectory</h5>
            <p class="text-white/40 leading-relaxed font-bold text-lg">
              Military-grade path optimization via Mapbox Engine. One-click re-routing for maximum time efficiency.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Call to Action -->
    <section class="py-60 px-8 relative z-20 overflow-hidden">
      <!-- Background Glow -->
      <div class="absolute inset-x-0 h-[800px] bg-primary-600/5 blur-[120px] -top-64 pointer-events-none"></div>
      
      <div class="max-w-6xl mx-auto rounded-[6rem] bg-secondary-900/40 backdrop-blur-3xl border border-white/10 p-16 md:p-32 text-center relative overflow-hidden group shadow-[0_100px_200px_rgba(0,0,0,0.4)] ring-1 ring-white/5">
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] group-hover:bg-primary-500/20 transition-all duration-1000"></div>
        <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary-500/10 rounded-full blur-[100px] group-hover:bg-secondary-500/20 transition-all duration-1000"></div>
        
        <div class="relative z-10 space-y-12">
            <h2 class="text-5xl md:text-9xl font-black text-white tracking-tighter leading-[0.85] select-none">Begin Your<br/><span class="text-primary-400">Descent</span></h2>
            <p class="text-[10px] font-black uppercase tracking-[1em] text-white/20">Authorization Required for Full Access</p>
            <button 
              @click="authStore.openAuthModal('register')"
              class="relative px-20 py-8 bg-white text-secondary-900 rounded-[3rem] font-black uppercase tracking-[0.4em] hover:scale-110 hover:-translate-y-2 active:scale-95 transition-all duration-700 shadow-[0_50px_100px_rgba(255,255,255,0.1)] text-[11px] group-hover:bg-primary-400 group-hover:text-white"
            >
              Start Onboarding
            </button>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-32 bg-[#01040f] border-t border-white/5 relative z-20">
      <div class="max-w-7xl mx-auto px-8 flex flex-col items-center gap-12">
          <div class="flex items-center gap-12">
              <a href="#" class="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-primary-500 transition-colors">Protocol</a>
              <a href="#" class="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-primary-500 transition-colors">Network</a>
              <a href="#" class="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-primary-500 transition-colors">Privacy</a>
          </div>
          <div class="h-[1px] w-40 bg-white/5"></div>
          <p class="text-[10px] font-black text-white/10 uppercase tracking-[0.8em] text-center">© 2026 TravelMate Interface · Build v1.0.0-PRO-MAX</p>
          <div class="flex items-center gap-2">
              <div class="w-1.4 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              <span class="text-[8px] font-black text-green-500/50 uppercase tracking-[0.3em]">All Systems Nominal</span>
          </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.perspective-text {
    transform: perspective(1000px) transitionZ(0px);
}

@keyframes subtle-zoom {
  0% { transform: scale(1.1); }
  100% { transform: scale(1.25); opacity: 0.15; }
}

.animate-subtle-zoom {
  animation: subtle-zoom 30s infinite alternate ease-in-out;
}

@keyframes fade-in-up {
  0% { opacity: 0; transform: translateY(40px); }
  100% { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #020617;
}
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.1);
}
</style>

<style scoped>
@keyframes subtle-zoom {
  0% { transform: scale(1.05); }
  100% { transform: scale(1.15); }
}

.animate-subtle-zoom {
  animation: subtle-zoom 20s infinite alternate ease-in-out;
}

@keyframes fade-in-up {
  0% { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 0.8s forwards ease-out;
}

/* Custom scrollbar */
:root {
  scrollbar-gutter: stable;
}

::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #f8fafc;
}
::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
