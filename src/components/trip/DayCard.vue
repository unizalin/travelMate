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
        weekday: 'long'
    }).format(date)
})

const activityCount = computed(() => props.itinerary.activities?.length || 0)

function formatTime(time: string) {
    if (!time) return ''
    return time.substring(0, 5) // HH:MM
}
</script>

<template>
    <UICard
        :shadow="isEditMode ? 'md' : 'sm'"
        :class="[
            'group transition-all duration-300 animate-fade-in',
            { 'ring-2 ring-primary-500 ring-offset-2': isEditMode }
        ]"
        body-class="p-0"
        @click="handleClick"
    >
        <!-- Edit Mode Content -->
        <div v-if="isEditMode" class="p-6 bg-primary-50/30 h-full" @click.stop>
            <div class="flex justify-between items-center mb-6 border-b border-primary-100 pb-4">
                <div>
                    <h3 class="text-xl font-heading font-bold text-secondary-900">第 {{ itinerary.day_number }} 天</h3>
                    <p class="text-sm text-secondary-500 font-body">{{ formattedDate }}</p>
                </div>
                <UIButton variant="ghost" size="sm" @click="isEditMode = false">
                   完成
                </UIButton>
            </div>
            <ActivityEditMode :itinerary="itinerary" @done="isEditMode = false"
                @add-activity="$emit('add-activity', itinerary.id)" />
        </div>

        <!-- View Mode -->
        <template v-else>
            <!-- Header -->
            <div class="px-5 py-4 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/50">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-accent-500 text-white flex items-center justify-center font-bold shadow-sm">
                      {{ itinerary.day_number }}
                    </div>
                    <div>
                        <h3 class="text-base font-heading font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">
                          行程安排
                        </h3>
                        <p class="text-xs text-secondary-500 font-body">{{ formattedDate }}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <WeatherTooltip :weather="weather" />
                    <div class="flex items-center bg-white rounded-lg p-1 border border-secondary-100 shadow-sm">
                      <button @click.stop="isEditMode = true"
                          class="p-1.5 rounded-md hover:bg-secondary-50 text-secondary-400 hover:text-primary-600 transition-all"
                          title="編輯行程">
                          <PencilSquareIcon class="w-5 h-5" />
                      </button>
                      <button @click.stop="$emit('add-activity', itinerary.id)"
                          class="p-1.5 rounded-md hover:bg-secondary-50 text-secondary-400 hover:text-primary-600 transition-all" 
                          title="新增景點">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                          </svg>
                      </button>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div class="p-5">
                <div v-if="activityCount > 0" class="space-y-4">
                    <div v-for="activity in itinerary.activities" :key="activity.id"
                        class="flex gap-4 p-3 rounded-xl hover:bg-primary-50/50 border border-transparent hover:border-primary-100 cursor-pointer transition-all group/item"
                        @click.stop="$emit('edit-activity', activity)">
                        
                        <div class="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-secondary-100 text-[10px] font-bold text-secondary-500 group-hover/item:bg-primary-600 group-hover/item:text-white transition-colors">
                            {{ activity.order_index + 1 }}
                        </div>

                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-start gap-2">
                                <h4 class="font-bold text-secondary-900 text-sm truncate group-hover/item:text-primary-600 transition-colors">
                                  {{ activity.name }}
                                </h4>
                                <UIBadge v-if="activity.start_time" variant="primary" size="xs" class="whitespace-nowrap">
                                    {{ formatTime(activity.start_time) }}
                                    <span v-if="activity.end_time" class="opacity-60 ml-0.5">- {{ formatTime(activity.end_time) }}</span>
                                </UIBadge>
                            </div>

                            <div class="mt-2 flex flex-wrap gap-2 items-center text-xs text-secondary-500">
                                <div v-if="activity.location" class="flex items-center max-w-[200px]">
                                    <svg class="w-3.5 h-3.5 mr-1 text-secondary-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span class="truncate">{{ activity.location }}</span>
                                </div>
                                <div v-if="!activity.start_time && activity.duration" class="flex items-center">
                                    <svg class="w-3.5 h-3.5 mr-1 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {{ activity.duration }} 分鐘
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="text-center py-12">
                    <div class="w-16 h-16 bg-secondary-50 text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p class="text-sm text-secondary-400 font-body">尚未安排行程</p>
                    <UIButton variant="ghost" size="sm" class="mt-4" @click.stop="$emit('add-activity', itinerary.id)">
                      開始規劃
                    </UIButton>
                </div>
            </div>
        </template>
    </UICard>
</template>
