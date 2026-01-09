<template>
  <UICard
    shadow="sm"
    hoverable
    body-class="p-0"
    @click="goToDetail"
    class="overflow-hidden group animate-fade-in"
  >
    <div class="h-32 bg-primary-50 sm:h-40 relative overflow-hidden">
      <!-- Placeholder image decoration -->
      <div class="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200"></div>
      <div class="absolute inset-0 flex items-center justify-center text-primary-300 transform group-hover:scale-110 transition-transform duration-500">
        <svg class="w-16 h-16 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a3 3 0 013 3v.354m.437-12.827A9.761 9.761 0 0012 2C6.477 2 2 6.477 2 12c0 2.391.838 4.588 2.238 6.287l1.396-1.397a5.552 5.552 0 01-.253-2.616 5.56 5.56 0 011.603-4.14 5.561 5.561 0 014.14-1.603 5.552 5.552 0 012.616.253l1.397-1.396A9.76 9.76 0 0012 2.065c-.021 0-.042.001-.063.001z" />
        </svg>
      </div>
      <!-- Destination Badge -->
      <div class="absolute top-3 right-3">
        <UIBadge variant="primary" size="sm" class="bg-white/90 backdrop-blur-sm border-transparent shadow-sm">
          {{ trip.destination }}
        </UIBadge>
      </div>
    </div>
    
    <div class="p-5">
      <h3 class="text-lg font-heading font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">
        {{ trip.name }}
      </h3>
      
      <div class="mt-4 flex items-center justify-between">
        <div class="flex items-center text-sm text-secondary-500">
          <svg class="w-4 h-4 mr-1.5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {{ trip.start_date }}
        </div>
        
        <UIBadge v-if="daysUntilStart > 0" variant="info" size="xs">
          In {{ daysUntilStart }} days
        </UIBadge>
        <UIBadge v-else variant="success" size="xs">
          Ongoing
        </UIBadge>
      </div>
    </div>
  </UICard>
</template>

<script setup lang="ts">
import type { Database } from '@/types/database';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import UICard from '@/components/ui/Card.vue'
import UIBadge from '@/components/ui/Badge.vue'

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
