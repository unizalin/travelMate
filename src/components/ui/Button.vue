<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-2xl font-black transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 uppercase tracking-widest',
      variantClasses[variant],
      sizeClasses[size],
      { 'w-full': block }
    ]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <slot name="icon-left"></slot>
    <span :class="{ 'ml-2.5': $slots['icon-left'] && !loading, 'mr-2.5': $slots['icon-right'] }">
      <slot></slot>
    </span>
    <slot name="icon-right"></slot>
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  block?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  block: false
})

defineEmits(['click'])

const variantClasses = {
  primary: 'bg-primary-600 text-white hover:bg-primary-500 shadow-xl shadow-primary-500/20',
  secondary: 'bg-white dark:bg-white/5 text-gray-700 dark:text-white border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 shadow-sm',
  ghost: 'bg-transparent text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5',
  danger: 'bg-rose-500 text-white hover:bg-rose-400 shadow-xl shadow-rose-500/20',
  success: 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-xl shadow-emerald-500/20'
}

const sizeClasses = {
  sm: 'px-4 py-2 text-[10px]',
  md: 'px-6 py-3.5 text-[10px]',
  lg: 'px-8 py-4.5 text-xs'
}
</script>
