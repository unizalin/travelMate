<template>
  <div class="w-full">
    <div class="flex border-b border-gray-100 dark:border-white/5 transition-colors overflow-x-auto no-scrollbar">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="$emit('update:modelValue', tab.value)"
        :class="[
          'px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 relative whitespace-nowrap',
          modelValue === tab.value 
            ? 'text-primary-600 dark:text-primary-400' 
            : 'text-gray-400 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5'
        ]"
      >
        {{ tab.label }}
        <div
          v-if="modelValue === tab.value"
          class="absolute bottom-0 left-6 right-6 h-1 bg-primary-600 dark:bg-primary-500 rounded-full animate-pop-in shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
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
