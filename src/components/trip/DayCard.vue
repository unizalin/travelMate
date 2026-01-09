<template>
  <UICard
    shadow="sm"
    hoverable
    body-class="p-0"
    @click="handleClick"
    :class="[
      'group transition-all duration-300 animate-fade-in flex flex-col h-full overflow-hidden rounded-2xl border-none',
      { 'ring-2 ring-primary-500 ring-offset-2': isEditMode }
    ]"
  >
    <!-- Header: Sky Blue Gradient -->
    <div class="relative h-28 flex-shrink-0 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400 p-5 flex flex-col justify-between items-start overflow-hidden">
      <!-- Decorative Background Icon -->
      <div class="absolute -right-4 -bottom-4 text-white/10 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
        <svg class="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
        </svg>
      </div>

      <div class="flex justify-between w-full items-start relative z-10">
        <div class="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
          <span class="text-white text-xs font-bold font-heading uppercase tracking-wider">Day {{ itinerary.day_number }}</span>
        </div>
        
        <div class="flex gap-2">
          <WeatherTooltip :weather="weather" class="text-white" />
          <button 
            v-if="!isEditMode"
            @click.stop="isEditMode = true"
            class="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all border border-white/10"
            title="編輯行程"
          >
            <PencilSquareIcon class="w-4 h-4" />
          </button>
          <UIButton v-else variant="ghost" size="sm" class="bg-white text-primary-600 hover:bg-primary-50" @click="isEditMode = false">
            完成
          </UIButton>
        </div>
      </div>

      <div class="relative z-10 w-full flex justify-between items-end">
        <div>
          <h3 class="text-lg font-heading font-bold text-white leading-tight">行程安排</h3>
          <p class="text-xs text-white/80 font-body">{{ formattedDate }}</p>
        </div>
        <UIBadge variant="success" size="xs" class="bg-emerald-400 text-white border-none shadow-sm">
          {{ activityCount }} 景點
        </UIBadge>
      </div>
    </div>

    <!-- Body: Info Snapshot -->
    <div class="flex-1 p-5 flex flex-col justify-between bg-white">
      <div v-if="isEditMode" @click.stop>
        <ActivityEditMode 
          :itinerary="itinerary" 
          @done="isEditMode = false"
          @add-activity="$emit('add-activity', itinerary.id)" 
        />
      </div>

      <div v-else class="space-y-4">
        <!-- Start/End Route Preview -->
        <div v-if="activityCount > 0" class="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-secondary-100 before:border-dashed before:border-l-2">
          <!-- Start Activity -->
          <div class="relative">
            <div class="absolute -left-7 top-1 w-3 h-3 rounded-full bg-primary-500 ring-4 ring-primary-50"></div>
            <p class="text-[10px] text-secondary-400 font-bold uppercase tracking-tighter mb-0.5">起點</p>
            <p class="text-sm font-bold text-secondary-900 truncate">{{ firstActivityName }}</p>
          </div>
          
          <!-- End Activity (if multiple) -->
          <div v-if="activityCount > 1" class="relative">
            <div class="absolute -left-7 top-1 w-3 h-3 rounded-full bg-secondary-300 ring-4 ring-secondary-50"></div>
            <p class="text-[10px] text-secondary-400 font-bold uppercase tracking-tighter mb-0.5">終點</p>
            <p class="text-sm font-bold text-secondary-900 truncate">{{ lastActivityName }}</p>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="py-6 flex flex-col items-center text-center">
          <div class="w-12 h-12 bg-secondary-50 text-secondary-200 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-primary-50 group-hover:text-primary-200 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p class="text-xs text-secondary-400 font-body">尚未規劃行程</p>
        </div>
      </div>

      <!-- Footer: Actions -->
      <div class="mt-4 pt-4 border-t border-secondary-50 flex items-center justify-between">
        <div class="flex items-center gap-1 text-[10px] text-secondary-400 font-medium">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ totalDuration }} min</span>
        </div>
        
        <UIButton 
          v-if="!isEditMode"
          variant="ghost" 
          size="sm" 
          class="text-primary-600 hover:bg-primary-50 font-bold text-xs px-2"
          @click.stop="$emit('add-activity', itinerary.id)"
        >
          <template #icon-left>
            <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </template>
          新增
        </UIButton>
      </div>
    </div>
  </UICard>
</template>

<script setup lang="ts">
import { PencilSquareIcon } from '@heroicons/vue/24/outline';
import { computed, ref } from 'vue';
import ActivityEditMode from '@/components/trip/ActivityEditMode.vue';
import WeatherTooltip from '@/components/common/WeatherTooltip.vue';
import UICard from '@/components/ui/Card.vue'
import UIBadge from '@/components/ui/Badge.vue'
import UIButton from '@/components/ui/Button.vue'

const props = defineProps<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itinerary: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    weather?: any
}>()

const emit = defineEmits<{
    (e: 'add-activity', itineraryId: string): void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: 'edit-activity', activity: any): void
    (e: 'click'): void
}>()

const isEditMode = ref(false)

function handleClick() {
    if (!isEditMode.value) {
        emit('click')
    }
}

const formattedDate = computed(() => {
    if (!props.itinerary.date) return ''
    const date = new Date(props.itinerary.date)
    return new Intl.DateTimeFormat('zh-TW', {
        month: 'long',
        day: 'numeric',
        weekday: 'short'
    }).format(date)
})

const activityCount = computed(() => props.itinerary.activities?.length || 0)

const firstActivityName = computed(() => {
  return props.itinerary.activities?.[0]?.name || '未設定名稱'
})

const lastActivityName = computed(() => {
  if (activityCount.value <= 1) return null
  return props.itinerary.activities[activityCount.value - 1]?.name || '未設定名稱'
})

const totalDuration = computed(() => {
  return props.itinerary.activities?.reduce((acc: number, act: any) => acc + (Number(act.duration) || 0), 0) || 0
})

</script>
