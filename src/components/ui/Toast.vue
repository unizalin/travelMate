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
        class="pointer-events-auto group relative flex items-center gap-4 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-xl border border-white/20 dark:border-white/5 px-6 py-4 rounded-[1.75rem] shadow-[0_30px_60px_rgba(0,0,0,0.2)] min-w-[340px] max-w-md overflow-hidden transition-all duration-300"
      >
        <!-- Type Indicator Bar -->
        <div :class="[bgClasses[toast.type], 'absolute left-0 top-0 bottom-0 w-1.5']" />

        <!-- Icon Container -->
        <div :class="[iconBgClasses[toast.type], 'flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm']">
          <component :is="icons[toast.type]" class="w-6 h-6" :class="iconColorClasses[toast.type]" />
        </div>

        <!-- Content -->
        <div class="flex-1 pr-4">
          <h4 class="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] leading-none mb-1.5 transition-colors">
            {{ titles[toast.type] }}
          </h4>
          <p class="text-xs font-bold text-gray-500 dark:text-white/40 leading-relaxed transition-colors">{{ toast.message }}</p>
        </div>

        <!-- Close Button -->
        <button 
          @click="removeToast(toast.id)"
          class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/20 transition-all hover:rotate-90"
        >
          <XMarkIcon class="w-4 h-4" />
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
  success: 'bg-emerald-500 dark:bg-emerald-400',
  error: 'bg-rose-500 dark:bg-rose-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  info: 'bg-primary-500 dark:bg-primary-400'
}

const iconBgClasses = {
  success: 'bg-emerald-50 dark:bg-emerald-900/20',
  error: 'bg-rose-50 dark:bg-rose-900/20',
  warning: 'bg-amber-50 dark:bg-amber-900/20',
  info: 'bg-primary-50 dark:bg-primary-900/20'
}

const iconColorClasses = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-primary-600 dark:text-primary-400'
}
</script>

<style scoped>
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
</style>
