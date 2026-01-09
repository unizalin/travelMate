<script setup lang="ts">
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activity: any
}>()

const emit = defineEmits<{
  (e: 'delete', id: string): void
}>()
</script>

<template>
  <div class="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
    <!-- Time/Order -->
    <div class="flex-shrink-0 w-16 text-center">
      <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Order {{ activity.order_index }}
      </div>
      <div v-if="activity.duration" class="mt-1 text-xs text-gray-500">
        {{ activity.duration }}m
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <h4 class="text-sm font-medium text-gray-900">{{ activity.name }}</h4>
      <p v-if="activity.location" class="text-sm text-gray-500 truncate">📍 {{ activity.location }}</p>
      <p v-if="activity.notes" class="mt-1 text-sm text-gray-500 line-clamp-2">{{ activity.notes }}</p>
    </div>

    <!-- Actions -->
    <div>
      <button @click="emit('delete', activity.id)" class="text-gray-400 hover:text-red-500">
        <span class="sr-only">Delete</span>
        🗑️
      </button>
    </div>
  </div>
</template>
