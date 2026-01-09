<template>
  <div
    :class="[
      'bg-white rounded-xl border border-secondary-100 transition-all duration-300',
      shadowClasses[shadow],
      { 'hover:shadow-lg hover:-translate-y-1 cursor-pointer': hoverable }
    ]"
    @click="hoverable && $emit('click')"
  >
    <div v-if="$slots.header" class="px-5 py-4 border-b border-secondary-50">
      <slot name="header"></slot>
    </div>
    <div :class="['px-5 py-4', bodyClass]">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="px-5 py-3 bg-secondary-50/50 border-t border-secondary-50 rounded-b-xl">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  bodyClass?: string
}

withDefaults(defineProps<Props>(), {
  shadow: 'sm',
  hoverable: false,
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
