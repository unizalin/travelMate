<script setup lang="ts">
import type { Database } from '@/types/database';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

type Trip = Database['public']['Tables']['trips']['Row']

const props = defineProps<{
  trip: Trip
}>()

const router = useRouter()

const daysUntilStart = computed(() => {
  const start = new Date(props.trip.start_date)
  const now = new Date()
  const diffTime = start.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

function goToDetail() {
  router.push(`/trips/${props.trip.id}`)
}
</script>

<template>
  <div @click="goToDetail"
    class="block cursor-pointer overflow-hidden rounded-lg bg-white shadow transition hover:shadow-md">
    <div class="h-32 bg-primary-100 sm:h-40 relative">
      <!-- Placeholder for image -->
      <div class="absolute inset-0 flex items-center justify-center text-primary-300">
        <span class="text-4xl">✈️</span>
      </div>
    </div>
    <div class="p-4">
      <h3 class="text-lg font-semibold text-gray-900">{{ trip.name }}</h3>
      <p class="text-sm text-gray-500">{{ trip.destination }}</p>

      <div class="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div>{{ trip.start_date }}</div>
        <div v-if="daysUntilStart > 0" class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
          In {{ daysUntilStart }} days
        </div>
        <div v-else class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Ongoing
        </div>
      </div>
    </div>
  </div>
</template>
