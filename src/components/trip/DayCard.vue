<template>
  <UICard
    shadow="sm"
    hoverable
    body-class="p-0"
    @click="handleClick"
    class="group transition-all duration-300 animate-fade-in flex flex-col h-full overflow-hidden rounded-2xl border-none"
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

    <!-- Body: Activity List -->
    <div 
      class="flex-1 p-5 flex flex-col bg-white overflow-hidden"
      :class="{ 'bg-primary-50/30 ring-2 ring-inset ring-primary-100': isDragOver }"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop="isDragOver = false"
    >
      <draggable 
        v-model="localActivities" 
        group="activities" 
        item-key="id"
        ghost-class="ghost-activity"
        drag-class="drag-activity"
        class="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1 min-h-[100px]"
        @change="onActivitiesChange"
        @start="isDragging = true"
        @end="onDragEnd"
      >
        <template #item="{ element: activity, index: idx }">
          <div 
            class="relative flex items-start gap-4 group/item cursor-move active:cursor-grabbing"
          >
            <!-- Progress Line (Decorative) -->
            <div 
              v-if="(idx as number) < localActivities.length - 1"
              class="absolute left-[11px] top-6 bottom-[-16px] w-0.5 bg-secondary-50"
            ></div>

            <!-- Icon & Index -->
            <div class="flex flex-col items-center flex-shrink-0 pt-0.5">
              <div 
                class="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition-colors"
                :class="(idx as number) === 0 ? 'bg-primary-500 text-white shadow-sm' : 'bg-white border-2 border-primary-200 text-primary-500'"
              >
                {{ (idx as number) + 1 }}
              </div>
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0 pr-2 pb-2">
              <div class="flex justify-between items-start mb-0.5">
                <span class="text-[10px] font-bold text-secondary-400 uppercase tracking-tight">景點 {{ (idx as number) + 1 }}</span>
                <button 
                  @click.stop="handleEdit(activity)"
                  class="p-1 -mr-1 hover:bg-primary-50 active:bg-primary-100 rounded-md transition-all text-secondary-300 hover:text-primary-600 opacity-0 group-hover/item:opacity-100 sm:opacity-0 lg:group-hover/item:opacity-100"
                  :class="{ 'opacity-100': isMobile }"
                  title="編輯景點"
                >
                  <PencilIcon class="w-3 h-3" />
                </button>
              </div>
              <h4 class="text-sm font-bold text-secondary-900 truncate group-hover/item:text-primary-600 transition-colors">
                {{ activity.name }}
              </h4>
              <p v-if="activity.start_time" class="text-[10px] text-secondary-400 font-medium mt-0.5">
                {{ formatTime(activity.start_time) }}
              </p>
            </div>
          </div>
        </template>

        <template #footer>
          <!-- Empty State within Draggable to allow dropping on empty cards -->
          <div v-if="localActivities.length === 0" class="py-12 flex flex-col items-center text-center">
            <div class="w-12 h-12 bg-secondary-50 text-secondary-200 rounded-2xl flex items-center justify-center mb-3">
              <MapPinIcon class="w-6 h-6" />
            </div>
            <p class="text-xs text-secondary-400 font-body">拖曳景點至此</p>
          </div>
        </template>
      </draggable>

      <!-- Add Activity Button -->
      <button 
        @click.stop="handleAddActivity"
        class="mt-4 w-full py-3 border-2 border-dashed border-secondary-100 rounded-xl text-secondary-400 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/50 transition-all flex items-center justify-center gap-2 group/add flex-shrink-0"
      >
        <PlusIcon class="w-4 h-4 transition-transform group-hover/add:scale-110" />
        <span class="text-xs font-bold font-heading">新增景點</span>
      </button>
    </div>

    <!-- Modals -->
    <AddActivityModal
      v-if="isAddModalOpen"
      :is-open="isAddModalOpen"
      :itinerary-id="itinerary.id"
      :trip-id="itinerary.trip_id"
      :current-order="activityCount" 
      @close="isAddModalOpen = false"
      @success="handleSuccess"
    />

    <EditActivityModal
      v-if="selectedActivity"
      :is-open="!!selectedActivity"
      :activity="selectedActivity"
      @close="selectedActivity = null"
      @success="handleSuccess"
    />
  </UICard>
</template>

<script setup lang="ts">
import { PencilIcon, PlusIcon, MapPinIcon } from '@heroicons/vue/24/solid';
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import draggable from 'vuedraggable';
import WeatherTooltip from '@/components/common/WeatherTooltip.vue';
import UICard from '@/components/ui/Card.vue'
import UIBadge from '@/components/ui/Badge.vue'
import AddActivityModal from '@/components/modals/AddActivityModal.vue';
import EditActivityModal from '@/components/modals/EditActivityModal.vue';
import { useItineraryStore } from '@/stores/itinerary';

const props = defineProps<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itinerary: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    weather?: any
}>()

const emit = defineEmits<{
    (e: 'click'): void
}>()

const itineraryStore = useItineraryStore()
const isAddModalOpen = ref(false)
const selectedActivity = ref<any>(null)
const isMobile = ref(false)

// Draggable state
const localActivities = ref([...(props.itinerary.activities || [])]);
const isDragging = ref(false);
const isDragOver = ref(false);

watch(() => props.itinerary.activities, (newVal) => {
  if (!isDragging.value) {
    localActivities.value = [...(newVal || [])];
  }
}, { deep: true });

function onActivitiesChange(evt: any) {
  // We care about 'added', 'removed', or 'moved' events to trigger a save
  if (evt.added || evt.removed || evt.moved) {
    saveNewOrder();
  }
}

async function saveNewOrder() {
  try {
    await itineraryStore.updateActivitiesBatch(props.itinerary.id, localActivities.value);
  } catch (error) {
    console.error('Failed to save activity order:', error);
    // Optionally revert state on failure
  }
}

function onDragEnd() {
  isDragging.value = false;
  isDragOver.value = false;
}

function handleClick() {
    emit('click')
}

function handleEdit(activity: any) {
    selectedActivity.value = activity
}

function handleAddActivity() {
    isAddModalOpen.value = true
}

function handleSuccess() {
    itineraryStore.fetchItineraries(props.itinerary.trip_id)
    isAddModalOpen.value = false
    selectedActivity.value = null
}

const formatTime = (time: string) => time?.substring(0, 5)

const formattedDate = computed(() => {
    if (!props.itinerary.date) return ''
    const date = new Date(props.itinerary.date)
    return new Intl.DateTimeFormat('zh-TW', {
        month: 'long',
        day: 'numeric',
        weekday: 'short'
    }).format(date)
})

const activityCount = computed(() => localActivities.value.length)

// Responsive check
const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
}

onMounted(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #f1f5f9;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #cbd5e1;
}

/* Draggable visual effects */
.ghost-activity {
  opacity: 0.3;
  box-shadow: inset 0 0 0 2px #3b82f6;
  border-radius: 0.75rem;
  background-color: #eff6ff;
}

.drag-activity {
  opacity: 1 !important;
  transform: scale(1.05);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  background-color: white;
  border-radius: 0.75rem;
  box-shadow: 0 0 0 1px rgba(226, 232, 240, 1), 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  z-index: 50;
}
</style>

