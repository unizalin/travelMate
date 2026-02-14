<template>
  <div class="controls-overlay relative z-10 p-6 flex flex-col justify-between h-full pointer-events-none">
    <!-- Header -->
    <header class="flex justify-between items-start pointer-events-auto">
      <div>
        <h1 class="text-lg font-bold neon-text tracking-widest text-white">AERO-DART AI</h1>
        <p class="text-[9px] text-cyan-400 opacity-70">GLOBAL LOCATOR POWERED BY VUE 3</p>
      </div>
      <div class="text-right">
        <span class="text-[9px] font-mono text-cyan-500/80">
          LAT: {{ lat.toFixed(2) }} | LON: {{ lon.toFixed(2) }}
        </span>
      </div>
    </header>

    <!-- Center Crosshair (Visual Only) -->
    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div class="w-[50px] h-[50px] border border-cyan-500/50 rounded-full flex items-center justify-center relative">
        <div class="absolute w-[15px] h-[1px] bg-[#00F2FF]"></div>
        <div class="absolute w-[1px] h-[15px] bg-[#00F2FF]"></div>
        <div class="w-[80%] h-[80%] border border-dashed border-cyan-500/30 rounded-full animate-spin-slow"></div>
      </div>
    </div>

    <!-- Main Destination Card -->
    <div class="flex items-center justify-center pointer-events-none">
      <div 
        v-if="destination"
        class="glass-morphism p-5 w-full max-w-[320px] pointer-events-auto transition-all duration-500 transform destination-card"
        :class="{ 'opacity-0 translate-y-8': !destination, 'opacity-100 translate-y-0': destination }"
      >
        <div class="flex items-center gap-2 mb-3">
          <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
          <span class="text-[9px] tracking-[0.2em] text-cyan-300 font-bold uppercase">Target Locked</span>
        </div>
        
        <div class="relative rounded-xl overflow-hidden mb-3 aspect-[4/3] border border-white/10 group">
          <img :src="destination.img" alt="Destination" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div class="absolute bottom-2 left-3">
            <h2 class="text-xl font-bold text-white tracking-tight">{{ destination.name }}</h2>
            <p class="text-xs text-cyan-300">{{ destination.temp }} | {{ destination.price }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-4">
          <button @click="$emit('ai-plan')" class="py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase hover:bg-cyan-500/40 transition-all">✨ 規劃 3 日行程</button>
          <button @click="$emit('ai-highlights')" class="py-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase hover:bg-purple-500/40 transition-all">✨ AI 景點亮點</button>
        </div>

        <div class="flex gap-2">
          <button @click="$emit('tts')" class="w-10 h-10 rounded-lg glass-morphism flex items-center justify-center text-white hover:bg-white/10" title="✨ AI 朗讀">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </button>
          <button class="flex-1 py-3 rounded-lg bg-cyan-500 text-slate-900 font-bold text-[10px] uppercase tracking-wider hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            Book Trip
          </button>
          <button @click="$emit('reset')" class="w-10 h-10 rounded-lg glass-morphism flex items-center justify-center text-white hover:bg-white/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer Controls -->
    <footer class="flex flex-col items-center gap-4 pb-4 pointer-events-auto">
      <p class="text-[9px] text-white/50 tracking-[0.2em] uppercase">滑動旋轉或開啟自動旋轉</p>
      <div class="flex items-center gap-6">
        <!-- Auto Rotate Button -->
        <button 
          @click="$emit('toggle-rotate')" 
          class="w-12 h-12 rounded-full glass-morphism flex items-center justify-center text-cyan-400 border border-cyan-500/30 transition-all hover:bg-cyan-500/10"
          :class="{ 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.3)]': isAutoRotating }"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M2.5 16l0.7 0.8a10 10 0 0 0 18.8-4.3"/></svg>
        </button>

        <!-- Launch Button -->
        <button 
          @click="$emit('launch')" 
          class="btn-launch w-16 h-16 rounded-full flex items-center justify-center border-4 border-white/20 hover:scale-105 active:scale-95 transition-transform"
          :disabled="isSpinning"
          title="發射飛鏢 (Launch Dart)"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
        
        <!-- Spacer for symmetry -->
        <div class="w-12 h-12"></div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  lat: number
  lon: number
  destination: any
  isSpinning: boolean
  isAutoRotating: boolean
}>()

defineEmits(['launch', 'reset', 'toggle-rotate', 'ai-plan', 'ai-highlights', 'tts'])
</script>

<style scoped>
.glass-morphism {
  background: rgba(10, 25, 47, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 242, 255, 0.2);
  border-radius: 20px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
}

.neon-text {
  text-shadow: 0 0 10px rgba(0, 242, 255, 0.8);
}

.btn-launch {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
}

.animate-spin-slow {
  animation: spin 8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
