<template>
  <div class="fixed bottom-8 right-8 z-[999] flex flex-col items-end gap-3 pointer-events-none">
    <TransitionGroup
      enter-active-class="transform ease-out duration-500 transition-all"
      enter-from-class="translate-x-full opacity-0 scale-90"
      enter-to-class="translate-x-0 opacity-100 scale-100"
      leave-active-class="transform ease-in duration-300 transition-all absolute"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-90"
      move-class="transition-all duration-500"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto group relative flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-white/20 px-6 py-4 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] min-w-[320px] max-w-md overflow-hidden"
      >
        <!-- Type Indicator Bar -->
        <div :class="[bgClasses[toast.type], 'absolute left-0 top-0 bottom-0 w-1.5']" />

        <!-- Icon Container -->
        <div :class="[iconBgClasses[toast.type], 'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110']">
          <component :is="icons[toast.type]" class="w-6 h-6" :class="iconColorClasses[toast.type]" />
        </div>

        <!-- Content -->
        <div class="flex-1 pr-4">
          <h4 class="text-sm font-black text-secondary-900 tracking-tight leading-none mb-1">
            {{ titles[toast.type] }}
          </h4>
          <p class="text-xs font-bold text-secondary-500 leading-relaxed">{{ toast.message }}</p>
        </div>

        <!-- Close Button -->
        <button 
          @click="removeToast(toast.id)"
          class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary-100 transition-colors"
        >
          <XMarkIcon class="w-4 h-4 text-secondary-400" />
        </button>

        <!-- Progress Bar (Internal) -->
        <div 
          v-if="(toast as any).duration !== 0"
          :class="[bgClasses[toast.type], 'absolute bottom-0 left-0 h-0.5 opacity-20']"
          :style="{ width: '100%', animation: `shrink ${(toast as any).duration || 3000}ms linear forwards` }"
        />
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'

const { toasts, removeToast } = useToast()

const icons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon
}

const titles = {
  success: '成功',
  error: '錯誤',
  warning: '警告',
  info: '提示'
}

const bgClasses = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-primary-500'
}

const iconBgClasses = {
  success: 'bg-emerald-50',
  error: 'bg-rose-50',
  warning: 'bg-amber-50',
  info: 'bg-primary-50'
}

const iconColorClasses = {
  success: 'text-emerald-600',
  error: 'text-rose-600',
  warning: 'text-amber-600',
  info: 'text-primary-600'
}
</script>

<style scoped>
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
</style>
