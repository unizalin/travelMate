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
      <div v-if="show" class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md z-[100] transition-opacity" @click="close"></div>
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
            'bg-white dark:bg-secondary-950 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 w-full max-w-md pointer-events-auto overflow-hidden transition-all duration-300',
            maxWidthClass
          ]"
        >
          <!-- Header -->
          <div class="px-8 py-6 flex items-center justify-between border-b border-gray-50 dark:border-white/5 transition-colors">
            <h3 class="text-2xl font-black text-gray-900 dark:text-white tracking-tight transition-colors">
              <slot name="title">{{ title }}</slot>
            </h3>
            <button @click="close" class="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 dark:text-white/20 transition-all">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-8 py-6 transition-colors">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-8 py-6 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-4 transition-colors">
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
