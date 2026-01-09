<script setup lang="ts">
import { PencilSquareIcon } from '@heroicons/vue/24/outline';
import { computed, ref } from 'vue';
import ActivityEditMode from '@/components/trip/ActivityEditMode.vue';
import WeatherTooltip from '@/components/common/WeatherTooltip.vue';

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
    <div @click="handleClick"
        class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden cursor-pointer"
        :class="{ 'ring-2 ring-primary-400': isEditMode }">
        <!-- Edit Mode Overlay/Component -->
        <div v-if="isEditMode" class="p-4 bg-blue-50/30 h-full" @click.stop>
            <div class="flex justify-between items-center mb-4 border-b pb-2">
                <div>
                    <h3 class="text-lg font-bold text-gray-900">第 {{ itinerary.day_number }} 天</h3>
                    <p class="text-sm text-gray-500">{{ formattedDate }}</p>
                </div>
            </div>
            <ActivityEditMode :itinerary="itinerary" @done="isEditMode = false"
                @add-activity="$emit('add-activity', itinerary.id)" />
        </div>

        <!-- View Mode -->
        <template v-else>
            <!-- Header -->
            <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg group">
                <div>
                    <h3 class="text-lg font-bold text-gray-900">第 {{ itinerary.day_number }} 天</h3>
                    <p class="text-sm text-gray-500">{{ formattedDate }}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <WeatherTooltip :weather="weather" />
                    <button @click.stop="isEditMode = true"
                        class="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-primary-600 transition-colors"
                        title="編輯行程">
                        <PencilSquareIcon class="w-5 h-5" />
                    </button>
                    <button @click.stop="$emit('add-activity', itinerary.id)"
                        class="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors" title="新增景點">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div class="p-4">
                <div v-if="activityCount > 0" class="space-y-4">
                    <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
                    <div v-for="activity in itinerary.activities" :key="activity.id"
                        class="flex gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors group"
                        @click.stop="$emit('edit-activity', activity)">
                        <div
                            class="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600 group-hover:bg-primary-200">
                            {{ activity.order_index + 1 }}
                        </div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <h4 class="font-medium text-gray-900">{{ activity.name }}</h4>
                                <span v-if="activity.start_time"
                                    class="text-xs font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                                    {{ formatTime(activity.start_time) }}
                                    <span v-if="activity.end_time">- {{ formatTime(activity.end_time) }}</span>
                                </span>
                            </div>

                            <div class="text-sm text-gray-500 space-y-1 mt-1">
                                <p v-if="activity.location" class="flex items-center">
                                    <svg class="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                                        stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span class="truncate">{{ activity.location }}</span>
                                </p>
                                <!-- Fallback to duration if no time range -->
                                <p v-if="!activity.start_time && activity.duration" class="flex items-center">
                                    <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {{ activity.duration }} 分鐘
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="text-center py-6 text-gray-400">
                    <p>尚未安排行程</p>
                </div>
            </div>
        </template>
    </div>
</template>
