<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { SparklesIcon, MapIcon, UserGroupIcon, GlobeAsiaAustraliaIcon } from '@heroicons/vue/24/outline'

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
  <div class="relative min-h-screen bg-white overflow-x-hidden">
    <!-- Hero Section -->
    <section class="relative h-screen flex items-center justify-center">
      <!-- Background Image with Custom Path Cut -->
      <div class="absolute inset-0 z-0">
        <div class="relative w-full h-full overflow-hidden">
          <img 
            src="/assets/images/hero.png" 
            class="w-full h-full object-cover scale-105 animate-subtle-zoom"
            alt="Travel Hero"
          />
          <!-- Overlay Gradient -->
          <div class="absolute inset-0 bg-gradient-to-b from-secondary-900/40 via-secondary-900/20 to-white"></div>
        </div>
        
        <!-- SVG Path Cut (Bottom) -->
        <div class="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-10">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="relative block w-full h-[150px] fill-white">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5,73.84-4.36,147.54,16.88,218.2,35.26,69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113,14.29,1200,52.47V0Z"></path>
          </svg>
        </div>
      </div>

      <!-- Hero Content -->
      <div class="relative z-20 text-center px-6 max-w-5xl mx-auto">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black uppercase tracking-[0.3em] mb-8 animate-fade-in-up">
          <SparklesIcon class="w-4 h-4 text-amber-400" />
          The Next Generation of Trip Planning
        </div>
        
        <h1 class="text-6xl md:text-8xl font-black text-white tracking-tighter mb-6 drop-shadow-2xl animate-fade-in-up [animation-delay:200ms]">
          Travel<span class="text-primary-400">Mate</span>
        </h1>
        
        <p class="text-xl md:text-2xl text-white/90 font-medium max-w-2xl mx-auto mb-10 drop-shadow-lg animate-fade-in-up [animation-delay:400ms]">
          讓每一次探險都充滿驚喜。多人協作、AI 智能排程、Mapbox 路徑優化，一切盡在掌握。
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up [animation-delay:600ms]">
          <template v-if="user">
            <button 
              @click="goToTrips"
              class="group relative px-10 py-5 bg-primary-600 rounded-[2rem] text-white font-black uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary-500/40"
            >
              <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span class="relative">我的行程庫</span>
            </button>
            <button 
              @click="handleLogout"
              class="px-10 py-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] text-white font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95"
            >
              登出
            </button>
          </template>
          <template v-else>
            <button 
              @click="authStore.openAuthModal('register')"
              class="group relative px-10 py-5 bg-primary-600 rounded-[2rem] text-white font-black uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary-500/40"
            >
              <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span class="relative">立即開始</span>
            </button>
            <button 
              @click="authStore.openAuthModal('login')"
              class="px-10 py-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] text-white font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95"
            >
              登入帳號
            </button>
          </template>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-32 px-6 bg-white relative z-20">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-20">
          <h2 class="text-[10px] font-black uppercase tracking-[0.5em] text-primary-500 mb-4">Core Capabilities</h2>
          <h3 class="text-4xl md:text-5xl font-black text-secondary-900 tracking-tight">為什麼選擇 TravelMate?</h3>
        </div>

        <div class="grid md:grid-cols-3 gap-12">
          <!-- Feature 1 -->
          <div class="group p-10 rounded-[3rem] bg-secondary-50 border border-transparent hover:border-primary-100 hover:bg-white hover:shadow-2xl hover:scale-105 transition-all duration-500">
            <div class="w-16 h-16 rounded-3xl bg-primary-50 flex items-center justify-center text-primary-600 mb-8 group-hover:rotate-12 transition-transform">
              <UserGroupIcon class="w-8 h-8" />
            </div>
            <h4 class="text-2xl font-black text-secondary-900 mb-4">多人協作</h4>
            <p class="text-secondary-500 leading-relaxed font-bold">
              邀請好友共同編輯行程，投票選出最想去的景點，意見從此不再分歧。
            </p>
          </div>

          <!-- Feature 2 -->
          <div class="group p-10 rounded-[3rem] bg-secondary-50 border border-transparent hover:border-amber-100 hover:bg-white hover:shadow-2xl hover:scale-105 transition-all duration-500">
            <div class="w-16 h-16 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-600 mb-8 group-hover:rotate-12 transition-transform">
              <GlobeAsiaAustraliaIcon class="w-8 h-8" />
            </div>
            <h4 class="text-2xl font-black text-secondary-900 mb-4">AI 助手</h4>
            <p class="text-secondary-500 leading-relaxed font-bold">
              串接 Google Gemini，根據您的偏好智能推薦景點並自動安排每日作息。
            </p>
          </div>

          <!-- Feature 3 -->
          <div class="group p-10 rounded-[3rem] bg-secondary-50 border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-2xl hover:scale-105 transition-all duration-500">
            <div class="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-8 group-hover:rotate-12 transition-transform">
              <MapIcon class="w-8 h-8" />
            </div>
            <h4 class="text-2xl font-black text-secondary-900 mb-4">路徑優化</h4>
            <p class="text-secondary-500 leading-relaxed font-bold">
              使用 Mapbox 頂級地圖服務，一鍵排序每日景點，找出最省時的移動路徑。
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Call to Action -->
    <section class="py-32 px-6">
      <div class="max-w-5xl mx-auto rounded-[4rem] bg-secondary-900 p-12 md:p-24 text-center relative overflow-hidden group">
        <div class="absolute inset-0 bg-primary-600 translate-y-full group-hover:translate-y-0 transition-transform duration-700 opacity-10"></div>
        <h2 class="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter">準備好開始您的冒險了嗎？</h2>
        <button 
          @click="authStore.openAuthModal('register')"
          class="px-12 py-6 bg-white text-secondary-900 rounded-[2rem] font-black uppercase tracking-widest hover:scale-110 active:scale-95 transition-all shadow-2xl"
        >
          免費註冊
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-12 border-t border-secondary-100 text-center">
      <p class="text-xs font-black text-secondary-400 uppercase tracking-widest">© 2026 TravelMate - Designed for the explorers</p>
    </footer>
  </div>
</template>

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
