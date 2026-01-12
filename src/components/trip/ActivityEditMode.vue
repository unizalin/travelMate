<script setup lang="ts">
import { useItineraryStore } from '@/stores/itinerary';
import { CheckIcon, PlusIcon } from '@heroicons/vue/24/outline';
import { ref, watch } from 'vue';
import EditableActivityCard from '@/components/trip/EditableActivityCard.vue';
import draggable from 'vuedraggable';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itinerary: any
}>()

const emit = defineEmits<{
  (e: 'done'): void
  (e: 'add-activity'): void
}>()

const itineraryStore = useItineraryStore()
const { showToast } = useToast()
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
      location: activity.location,
      duration: activity.duration,
      notes: activity.notes,
      latitude: activity.latitude,
      longitude: activity.longitude
    })
  } catch (e) {
    console.error('Update failed', e)
    showToast('更新失敗', 'error')
  } finally {
    loading.value = false
  }
}

async function handleDelete(id: string) {
  try {
    loading.value = true
    await itineraryStore.deleteActivity(id, props.itinerary.id)
    editingActivities.value = editingActivities.value.filter((a: any) => a.id !== id)
    showToast('已刪除', 'success')
  } catch (e) {
    console.error('Delete failed', e)
    showToast('刪除失敗', 'error')
  } finally {
    loading.value = false
  }
}

async function onDragEnd() {
  const updates = editingActivities.value.map((activity, index) => ({
    id: activity.id,
    order_index: index
  }));

  try {
    await Promise.all(updates.map(u => itineraryStore.updateActivity(u.id, { order_index: u.order_index })));
    showToast('排序已更新', 'success');
  } catch (e) {
    console.error("Reorder failed", e);
    showToast('排序更新失敗', 'error');
  }
}

function handleAdd() {
    emit('add-activity')
}

</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center mb-2 px-1">
      <div class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
        <h4 class="text-xs font-bold text-secondary-500 uppercase tracking-wider">編輯模式</h4>
      </div>
      <button 
        @click="$emit('done')"
        class="flex items-center bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1 rounded-full text-xs font-bold transition-all"
      >
        <CheckIcon class="w-3.5 h-3.5 mr-1" />
        完成
      </button>
    </div>

    <draggable 
      v-model="editingActivities" 
      item-key="id" 
      handle=".drag-handle" 
      ghost-class="opacity-50"
      drag-class="scale-[1.02]"
      @end="onDragEnd" 
      class="space-y-4"
    >
      <template #item="{ element: activity, index }">
        <EditableActivityCard 
          :activity="activity" 
          :index="index"
          @update="handleUpdate"
          @delete="handleDelete"
        />
      </template>
    </draggable>

    <!-- Add Button -->
    <button
      @click="handleAdd"
      class="w-full py-4 bg-white border-2 border-dashed border-secondary-200 rounded-2xl text-secondary-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-all flex flex-col justify-center items-center gap-2 group"
    >
      <div class="w-10 h-10 rounded-full bg-secondary-50 text-secondary-400 flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-all">
        <PlusIcon class="w-6 h-6" />
      </div>
      <span class="text-sm font-bold">新增景點</span>
    </button>
  </div>
</template>

