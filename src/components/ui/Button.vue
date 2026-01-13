<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
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
    <span :class="{ 'ml-2': $slots['icon-left'] && !loading, 'mr-2': $slots['icon-right'] }">
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
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm hover:shadow-md',
  secondary: 'bg-white text-secondary-700 border border-secondary-200 hover:bg-secondary-50 focus:ring-secondary-400',
  ghost: 'bg-transparent text-secondary-600 hover:bg-secondary-50 focus:ring-secondary-200',
  danger: 'bg-danger text-white hover:bg-red-600 focus:ring-red-400',
  success: 'bg-success text-white hover:bg-green-600 focus:ring-green-400'
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base'
}
</script>
