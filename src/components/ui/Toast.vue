<script setup lang="ts">
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline';
import { computed, watch } from 'vue';

const props = defineProps<{
  show: boolean
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const icon = computed(() => {
  switch (props.type) {
    case 'success': return CheckCircleIcon
    case 'error': return XCircleIcon
    case 'warning': return ExclamationCircleIcon
    case 'info': default: return InformationCircleIcon
  }
})

const iconColor = computed(() => {
  switch (props.type) {
    case 'success': return 'text-green-500'
    case 'error': return 'text-red-500'
    case 'warning': return 'text-yellow-500'
    case 'info': default: return 'text-blue-500'
  }
})

let timer: number | null = null

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (timer) clearTimeout(timer)
    timer = window.setTimeout(() => {
      emit('close')
    }, props.duration || 3000)
  }
})
</script>

<template>
  <Transition
    enter-active-class="transform ease-out duration-300 transition"
    enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="show" class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 fixed bottom-4 right-4 z-50">
      <div class="p-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <component :is="icon" class="h-6 w-6" :class="iconColor" aria-hidden="true" />
          </div>
          <div class="ml-3 w-0 flex-1 pt-0.5">
            <p class="text-sm font-medium text-gray-900">{{ message }}</p>
          </div>
          <div class="ml-4 flex flex-shrink-0">
            <button type="button" @click="emit('close')" class="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <span class="sr-only">Close</span>
              <XCircleIcon class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
