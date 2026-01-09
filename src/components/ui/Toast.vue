<template>
  <div class="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
    <TransitionGroup
      enter-active-class="ease-out duration-300"
      enter-from-class="opacity-0 translate-x-12 translate-y-0"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="ease-in duration-200"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto bg-white rounded-xl shadow-lg border border-secondary-100 p-4 flex items-center min-w-[300px] max-w-md animate-slide-in-right"
        :class="typeClasses[toast.type]"
      >
        <div class="mr-3 flex-shrink-0">
          <svg v-if="toast.type === 'success'" class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg v-else-if="toast.type === 'error'" class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="toast.type === 'info'" class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-semibold text-secondary-900">{{ toast.title }}</h4>
          <p v-if="toast.message" class="text-xs text-secondary-500 mt-0.5">{{ toast.message }}</p>
        </div>
        <button @click="remove(toast.id)" class="ml-4 text-secondary-400 hover:text-secondary-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface ToastMessage {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

const toasts = ref<ToastMessage[]>([])
let nextId = 0

const add = (toast: Omit<ToastMessage, 'id'>) => {
  const id = nextId++
  const newToast = { ...toast, id }
  toasts.value.push(newToast)
  
  if (toast.duration !== 0) {
    setTimeout(() => {
      remove(id)
    }, toast.duration || 3000)
  }
}

const remove = (id: number) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

defineExpose({ add, remove })

const typeClasses = {
  success: 'border-l-4 border-l-green-500',
  error: 'border-l-4 border-l-red-500',
  warning: 'border-l-4 border-l-amber-500',
  info: 'border-l-4 border-l-primary-500'
}
</script>
