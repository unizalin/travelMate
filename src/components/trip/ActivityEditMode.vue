<script setup lang="ts">
import { useItineraryStore } from '@/stores/itinerary';
import { CheckIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { ref, watch } from 'vue';

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itinerary: any
}>()

const emit = defineEmits<{
  (e: 'done'): void
  (e: 'add-activity'): void
}>()

const itineraryStore = useItineraryStore()
const loading = ref(false)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const editingActivities = ref<any[]>([])

// Initialize local state from props
watch(() => props.itinerary.activities, (newActivities) => {
  if (newActivities) {
    // Deep copy to avoid mutating props directly
    editingActivities.value = JSON.parse(JSON.stringify(newActivities))
  }
}, { immediate: true, deep: true })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleUpdate(activity: any) {
  try {
    loading.value = true
    await itineraryStore.updateActivity(activity.id, {
      name: activity.name,
      start_time: activity.start_time || null,
      end_time: activity.end_time || null,
      location: activity.location
    })
  } catch (e) {
    console.error('Update failed', e)
    // Revert logic could go here
  } finally {
    loading.value = false
  }
}

async function handleDelete(id: string) {
  if (!confirm('確定要刪除此景點嗎？')) return

  try {
    loading.value = true
    await itineraryStore.deleteActivity(id, props.itinerary.id)
    // Remove from local list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editingActivities.value = editingActivities.value.filter((a: any) => a.id !== id)
  } catch (e) {
    console.error('Delete failed', e)
  } finally {
    loading.value = false
  }
}

function handleAdd() {
    emit('add-activity')
}

</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center mb-2">
      <h4 class="text-sm font-medium text-gray-500">編輯模式</h4>
      <button 
        @click="$emit('done')"
        class="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
      >
        <CheckIcon class="w-4 h-4 mr-1" />
        完成
      </button>
    </div>

    <div class="space-y-3">
      <div 
        v-for="(activity, index) in editingActivities" 
        :key="activity.id" 
        class="bg-white p-3 rounded-lg border border-primary-200 shadow-sm"
      >
        <div class="flex gap-2 items-start">
            <!-- Order Badge -->
            <div class="mt-2 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                {{ index + 1 }}
            </div>

            <!-- Inputs -->
            <div class="flex-1 space-y-2">
                <div>
                    <input 
                        v-model="activity.name"
                        @change="handleUpdate(activity)"
                        type="text" 
                        placeholder="景點名稱"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-1 border"
                    />
                </div>
                
                <div class="flex gap-2">
                    <div class="flex-1">
                        <input 
                            v-model="activity.start_time"
                            @change="handleUpdate(activity)"
                            type="time" 
                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-1 border text-gray-600"
                        />
                    </div>
                    <span class="text-gray-400 self-center">-</span>
                    <div class="flex-1">
                        <input 
                            v-model="activity.end_time"
                            @change="handleUpdate(activity)"
                            type="time" 
                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-1 border text-gray-600"
                        />
                    </div>
                </div>

                <div>
                    <input 
                        v-model="activity.location"
                        @change="handleUpdate(activity)"
                        type="text" 
                        placeholder="地點"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-1 border text-gray-500"
                    />
                </div>
            </div>

            <!-- Actions -->
            <button 
                @click="handleDelete(activity.id)"
                class="mt-2 text-gray-400 hover:text-red-500 transition-colors p-1"
                title="刪除"
            >
                <TrashIcon class="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>

    <!-- Add Button -->
    <button
      @click="handleAdd"
      class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors flex justify-center items-center gap-1"
    >
      <PlusIcon class="w-5 h-5" />
      新增景點
    </button>
  </div>
</template>
