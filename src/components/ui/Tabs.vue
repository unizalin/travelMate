<template>
  <div class="w-full">
    <div class="flex border-b border-secondary-100">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="$emit('update:modelValue', tab.value)"
        :class="[
          'px-6 py-3 text-sm font-medium transition-all duration-200 relative',
          modelValue === tab.value 
            ? 'text-primary-600' 
            : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50/50'
        ]"
      >
        {{ tab.label }}
        <div
          v-if="modelValue === tab.value"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full animate-fade-in"
        ></div>
      </button>
    </div>
    <div class="mt-4">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  label: string
  value: string | number
}

interface Props {
  tabs: Tab[]
  modelValue: string | number
}

defineProps<Props>()
defineEmits(['update:modelValue'])
</script>
