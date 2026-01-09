<template>
  <Teleport to="body">
    <Transition
      enter-active-class="ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="show" class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-[100]" @click="close"></div>
    </Transition>

    <Transition
      enter-active-class="ease-out duration-300"
      enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
      enter-to-class="opacity-100 translate-y-0 sm:scale-100"
      leave-active-class="ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0 sm:scale-100"
      leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
    >
      <div v-if="show" class="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div 
          :class="[
            'bg-white rounded-2xl shadow-xl border border-secondary-100 w-full max-w-md pointer-events-auto overflow-hidden',
            maxWidthClass
          ]"
        >
          <!-- Header -->
          <div class="px-6 py-4 flex items-center justify-between border-b border-secondary-50">
            <h3 class="text-lg font-semibold text-secondary-900">
              <slot name="title">{{ title }}</slot>
            </h3>
            <button @click="close" class="text-secondary-400 hover:text-secondary-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-4">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-6 py-4 bg-secondary-50/50 flex justify-end gap-3">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  show: boolean
  title?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  maxWidth: 'md'
})

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}

const maxWidthClass = computed(() => {
  return {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }[props.maxWidth]
})
</script>
