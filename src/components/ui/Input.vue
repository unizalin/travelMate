<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block text-sm font-medium text-secondary-700 mb-1.5">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <div class="relative">
      <div v-if="$slots.prepend" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary-400">
        <slot name="prepend"></slot>
      </div>
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="[
          'block w-full transition-all duration-200 sm:text-sm rounded-lg border focus:ring-2 focus:ring-offset-0 outline-none',
          $slots.prepend ? 'pl-10' : 'pl-4',
          $slots.append ? 'pr-10' : 'pr-4',
          error 
            ? 'border-danger text-danger placeholder-red-300 focus:ring-red-500 focus:border-danger' 
            : 'border-secondary-200 text-secondary-900 placeholder-secondary-400 focus:ring-primary-500 focus:border-primary-500 hover:border-secondary-300',
          disabled ? 'bg-secondary-50 cursor-not-allowed' : 'bg-white'
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />
      <div v-if="$slots.append" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-secondary-400">
        <slot name="append"></slot>
      </div>
    </div>
    <p v-if="error && typeof error === 'string'" class="mt-1.5 text-xs text-danger" role="alert">
      {{ error }}
    </p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-secondary-500">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string | number
  label?: string
  id?: string
  type?: string
  placeholder?: string
  error?: boolean | string
  hint?: string
  disabled?: boolean
  required?: boolean
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  id: () => `input-${Math.random().toString(36).substr(2, 9)}`,
  placeholder: '',
  error: false,
  disabled: false,
  required: false
})

defineEmits(['update:modelValue', 'blur', 'focus'])
</script>
