<template>
  <span
    :class="[
      'inline-flex items-center rounded-lg font-black uppercase tracking-widest transition-colors',
      variantClasses[variant],
      sizeClasses[size]
    ]"
  >
    <slot></slot>
    <button
      v-if="removable"
      type="button"
      class="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-current hover:bg-black/10 focus:outline-none"
      @click.stop="$emit('remove')"
    >
      <span class="sr-only">Remove</span>
      <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
        <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 1" />
      </svg>
    </button>
  </span>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost'
  size?: 'xs' | 'sm' | 'md'
  removable?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'sm',
  removable: false
})

defineEmits(['remove'])

const variantClasses = {
  primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20',
  secondary: 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/60 border border-gray-200 dark:border-white/5',
  success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20',
  danger: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20',
  warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20',
  info: 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20',
  ghost: 'bg-transparent text-gray-500 dark:text-white/40 border border-gray-200 dark:border-white/10'
}

const sizeClasses = {
  xs: 'px-2 py-0.5 text-[10px]',
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm'
}
</script>
