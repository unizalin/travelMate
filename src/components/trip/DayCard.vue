<template>
  <UICard
    shadow="sm"
    hoverable
    body-class="p-0"
    @click="handleClick"
    class="group transition-all duration-300 animate-fade-in flex flex-col h-full overflow-hidden rounded-2xl border-none"
  >
    <!-- Header: Full Plate Banner -->
    <div class="relative h-28 flex-shrink-0 overflow-hidden bg-secondary-900">
      <!-- Background Image with Parallax-like effect -->
      <img 
        :src="dayImage" 
        class="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" 
        alt="Day background"
      />
      <!-- Gradient Overlay Layered -->
      <div class="absolute inset-0 bg-gradient-to-t from-secondary-900/90 via-secondary-900/40 to-secondary-900/20"></div>
      
      <!-- Content: Absolutely positioned and padded internally -->
      <div class="absolute inset-0 p-5 flex flex-col justify-between z-10">
        <div class="flex justify-between w-full items-start">
          <div class="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-sm">
            <span class="text-white text-[10px] font-black font-heading uppercase tracking-[0.2em]">Day {{ itinerary.day_number }}</span>
          </div>
          <WeatherTooltip :weather="weather" class="text-white drop-shadow-lg" />
        </div>

        <div class="w-full flex justify-between items-end">
          <div>
            <h3 class="text-xl font-black text-white tracking-tight leading-none mb-1.5 drop-shadow-md">
              行程摘要
            </h3>
            <p class="text-[10px] font-black text-white/70 tracking-[0.15em] font-body uppercase drop-shadow-sm">
              {{ formattedDate }}
            </p>
          </div>
          <div class="flex items-center gap-2 px-3.5 py-1.5 bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 shadow-lg group-hover:bg-white/20 transition-colors">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]"></div>
            <span class="text-[10px] font-black text-white uppercase tracking-[0.2em]">{{ activityCount }} 景點</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Body: Activity List -->
    <div 
      class="flex-1 p-5 flex flex-col bg-white overflow-hidden"
      :class="{ 'bg-primary-50/30 ring-4 ring-primary-500 ring-offset-2': isDragOver }"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop="handleDrop"
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
import AddActivityModal from '@/components/modals/AddActivityModal.vue';
import EditActivityModal from '@/components/modals/EditActivityModal.vue';
import { useItineraryStore } from '@/stores/itinerary';
import { candidateService } from '@/services/candidateService';
import { useToast } from '@/composables/useToast';

const dayImages = [
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop', // Lake/Boat
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop', // Yosemite
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop', // Desert Road
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop', // Mountain Lake
  'https://images.unsplash.com/photo-1493246507139-91e8bef99c02?q=80&w=2070&auto=format&fit=crop', // Snowy Peak
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=2070&auto=format&fit=crop', // City View
  'https://images.unsplash.com/photo-1472396961699-1bd220ef738c?q=80&w=2070&auto=format&fit=crop'  // Forest
]

const dayImage = computed(() => dayImages[(props.itinerary.day_number - 1) % dayImages.length])

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

const { showToast } = useToast()

async function handleDrop(e: DragEvent) {
  isDragOver.value = false
  const data = e.dataTransfer?.getData('application/json')
  if (!data) return

  try {
    const candidate = JSON.parse(data)
    // Only handle if it's a candidate activity (has no itinerary_id)
    if (candidate.id && !candidate.itinerary_id) {
       await itineraryStore.createActivity({
         itinerary_id: props.itinerary.id,
         name: candidate.name,
         location: candidate.location,
         notes: candidate.description,
         order_index: activityCount.value
       })
       
       await candidateService.updateCandidate(candidate.id, {
         status: 'added',
         added_to_day: props.itinerary.day_number,
         added_at: new Date().toISOString()
       })
       
       showToast(`已將 ${candidate.name} 加入第 ${props.itinerary.day_number} 天`, 'success')
       handleSuccess()
    }
  } catch (error) {
    console.error('Drop error:', error)
  }
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

