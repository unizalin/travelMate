<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block text-[10px] font-black text-gray-400 dark:text-white/20 mb-1.5 uppercase tracking-widest px-1 transition-colors">
      {{ label }}
      <span v-if="required" class="text-rose-500">*</span>
    </label>
    <div class="relative">
      <div v-if="$slots.prepend" class="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-300 dark:text-white/20 transition-colors">
        <slot name="prepend"></slot>
      </div>
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :class="[
          'block w-full transition-all duration-300 rounded-2xl border-none shadow-none focus:ring-4 outline-none py-4',
          $slots.prepend ? 'pl-14' : 'px-6',
          $slots.append ? 'pr-14' : 'px-6',
          error 
            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 placeholder:text-rose-300 dark:placeholder:text-rose-900 focus:ring-rose-500/10' 
            : 'bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10 focus:ring-primary-500/10 focus:bg-white dark:focus:bg-secondary-900',
          disabled ? 'bg-gray-100 dark:bg-white/5 cursor-not-allowed text-gray-300 dark:text-white/20' : ''
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />
      <div v-if="$slots.append" class="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none text-gray-300 dark:text-white/20 transition-colors">
        <slot name="append"></slot>
      </div>
    </div>
    <p v-if="error && typeof error === 'string'" class="mt-2 text-[10px] font-black text-rose-500 uppercase tracking-widest px-1 transition-colors" role="alert">
      {{ error }}
    </p>
    <p v-else-if="hint" class="mt-2 text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest px-1 transition-colors">
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
