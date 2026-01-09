<template>
  <span
    :class="[
      'inline-flex items-center rounded-full font-medium',
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
  primary: 'bg-primary-50 text-primary-700 border border-primary-100',
  secondary: 'bg-secondary-50 text-secondary-700 border border-secondary-100',
  success: 'bg-green-50 text-green-700 border border-green-100',
  danger: 'bg-red-50 text-red-700 border border-red-100',
  warning: 'bg-amber-50 text-amber-700 border border-amber-100',
  info: 'bg-sky-50 text-sky-700 border border-sky-100',
  ghost: 'bg-transparent text-secondary-500 border border-secondary-200'
}

const sizeClasses = {
  xs: 'px-2 py-0.5 text-[10px]',
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm'
}
</script>
