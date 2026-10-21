<template>
  <div
    :class="[
      glass ? 'glass-card' : 'bg-white dark:bg-secondary-900 border border-gray-100 dark:border-white/5',
      'rounded-3xl shadow-xl transition-all duration-500 overflow-hidden',
      shadowClasses[shadow],
      { 'hover:shadow-2xl hover:-translate-y-1 cursor-pointer': hoverable }
    ]"
    @click="hoverable && $emit('click')"
  >
    <div v-if="$slots.header" class="px-6 py-5 border-b border-gray-50 dark:border-white/5">
      <slot name="header"></slot>
    </div>
    <div :class="[bodyClass ? bodyClass : 'px-6 py-5']">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="px-6 py-4 bg-gray-50/50 dark:bg-black/20 border-t border-gray-50 dark:border-white/5 transition-colors">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  glass?: boolean
  bodyClass?: string
}

withDefaults(defineProps<Props>(), {
  shadow: 'none',
  hoverable: false,
  glass: false,
  bodyClass: ''
})

defineEmits(['click'])

const shadowClasses = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg'
}
</script>
