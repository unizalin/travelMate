<template>
  <div 
    @click="handleClick"
    class="group relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-secondary-900/40 backdrop-blur-3xl border border-slate-200 dark:border-white/5 hover:border-primary-500/50 transition-all duration-500 cursor-pointer flex flex-col h-full shadow-lg shadow-slate-200/50 dark:shadow-none"
  >
    <!-- Header: Full Plate Banner -->
    <div class="relative h-32 flex-shrink-0 overflow-hidden bg-slate-900 dark:bg-[#0a1224]">
      <!-- Background Image -->
      <img 
        :src="dayImage" 
        class="absolute inset-0 w-full h-full object-cover opacity-60 dark:opacity-40 group-hover:scale-110 transition-transform duration-1000" 
        alt="Day background"
      />
      <!-- Gradient Overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-slate-900 dark:from-[#0a1224] via-transparent to-transparent"></div>
      
      <!-- Content -->
      <div class="absolute inset-0 p-6 flex flex-col justify-between z-10">
        <div class="flex justify-between w-full items-start">
          <div class="bg-black/20 dark:bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 dark:border-white/10 shadow-xl">
            <span class="text-white text-[10px] font-black uppercase tracking-[0.2em]">Day {{ itinerary.day_number }}</span>
          </div>
          <WeatherTooltip :weather="weather" class="text-white drop-shadow-2xl" />
        </div>

        <div class="w-full flex justify-between items-end">
          <div>
            <h3 class="text-xl font-black text-white tracking-tight leading-none mb-1 shadow-black/50 drop-shadow-lg">
              {{ itinerary.title || '探索數據點' }}
            </h3>
            <p class="text-[8px] font-black text-white/60 dark:text-white/40 tracking-[0.2em] uppercase">
              {{ formattedDate }}
            </p>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 backdrop-blur-xl rounded-xl border border-primary-500/20 shadow-lg shadow-primary-500/5">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
            <span class="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">{{ activityCount }} NODES</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Body: Activity List -->
    <div 
      class="flex-1 p-6 flex flex-col relative z-10 bg-white/50 dark:bg-transparent"
      :class="{ 'bg-primary-500/5': isDragOver }"
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
        class="flex-1 space-y-5 overflow-y-auto no-scrollbar pr-1 min-h-[120px]"
        @change="onActivitiesChange"
        @start="isDragging = true"
        @end="onDragEnd"
      >
        <template #item="{ element: activity, index: idx }">
          <div 
            class="relative flex items-start gap-4 group/item cursor-move active:cursor-grabbing"
          >
            <!-- Connection Line -->
            <div 
              v-if="(idx as number) < localActivities.length - 1"
              class="absolute left-[11px] top-6 bottom-[-20px] w-px bg-slate-200 dark:bg-white/10"
            ></div>

            <!-- Connector Dot -->
            <div class="flex flex-col items-center flex-shrink-0 pt-1.5">
              <div 
                class="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-black z-10 transition-all duration-300"
                :class="(idx as number) === 0 ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/40 group-hover/item:border-primary-500/50 group-hover/item:text-primary-600 dark:group-hover/item:text-primary-400'"
              >
                {{ (idx as number) + 1 }}
              </div>
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0 pb-1">
              <div class="flex justify-between items-start mb-0.5">
                <span class="text-[8px] font-black text-slate-300 dark:text-white/20 uppercase tracking-[0.2em]">Node {{ (idx as number) + 1 }}</span>
                <button 
                  @click.stop="handleEdit(activity)"
                  class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-300 dark:text-white/20 hover:text-primary-600 dark:hover:text-primary-400 opacity-0 group-hover/item:opacity-100"
                >
                  <PencilIcon class="w-3 h-3" />
                </button>
              </div>
              <h4 class="text-sm font-black text-slate-700 dark:text-white/80 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors truncate">
                {{ activity.name }}
              </h4>
              <div v-if="activity.start_time" class="flex items-center gap-1.5 mt-1">
                <div class="w-1 h-1 rounded-full bg-primary-500/40"></div>
                <p class="text-[10px] text-slate-400 dark:text-white/40 font-black tracking-widest uppercase">
                  {{ formatTime(activity.start_time) }}
                </p>
              </div>
            </div>
          </div>
        </template>

        <template #footer>
          <!-- Empty State -->
          <div v-if="localActivities.length === 0" class="py-12 flex flex-col items-center text-center">
            <div class="w-12 h-12 bg-slate-50 dark:bg-white/5 text-slate-200 dark:text-white/10 rounded-2xl flex items-center justify-center mb-4 border border-slate-200 dark:border-white/5">
              <MapPinIcon class="w-6 h-6" />
            </div>
            <p class="text-[10px] text-slate-400 dark:text-white/20 font-black uppercase tracking-widest">部署數據點於此</p>
          </div>
        </template>
      </draggable>

      <!-- Add Button -->
      <button 
        @click.stop="handleAddActivity"
        class="mt-6 w-full py-3.5 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl text-slate-400 dark:text-white/20 hover:border-primary-500/50 hover:text-primary-600 dark:hover:text-white/60 hover:bg-primary-500/5 transition-all flex items-center justify-center gap-3 group/add"
      >
        <PlusIcon class="w-4 h-4 transition-transform group-hover/add:scale-125" />
        <span class="text-[10px] font-black uppercase tracking-widest">新增節點</span>
      </button>
    </div>

    <!-- Interactive Layer -->
    <div class="absolute inset-0 border border-slate-200 dark:border-white/5 rounded-[2.5rem] pointer-events-none group-hover:border-primary-500/30 transition-colors"></div>
  </div>
</template>

<script setup lang="ts">
import { PencilIcon, PlusIcon, MapPinIcon } from '@heroicons/vue/24/solid';
import { computed, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import WeatherTooltip from '@/components/common/WeatherTooltip.vue';
import { useItineraryStore } from '@/stores/itinerary';
import { candidateService } from '@/services/candidateService';
import { useToast } from '@/composables/useToast';

const dayImages = [
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1493246507139-91e8bef99c02?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1472396961699-1bd220ef738c?q=80&w=2070&auto=format&fit=crop'
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
    (e: 'add-activity', itId: string): void
    (e: 'edit-activity', activity: any): void
}>()

const itineraryStore = useItineraryStore()
const { showToast } = useToast()

const localActivities = ref([...(props.itinerary.activities || [])]);
const isDragging = ref(false);
const isDragOver = ref(false);

watch(() => props.itinerary.activities, (newVal) => {
  if (!isDragging.value) {
    localActivities.value = [...(newVal || [])];
  }
}, { deep: true });

function onActivitiesChange(evt: any) {
  if (evt.added || evt.removed || evt.moved) {
    saveNewOrder();
  }
}

async function saveNewOrder() {
  try {
    await itineraryStore.updateActivitiesBatch(props.itinerary.id, localActivities.value);
  } catch (error) {
    console.error('Failed to save activity order:', error);
  }
}

function onDragEnd() {
  isDragging.value = false;
  isDragOver.value = false;
}

async function handleDrop(e: DragEvent) {
  isDragOver.value = false
  const data = e.dataTransfer?.getData('application/json')
  if (!data) return

  try {
    const candidate = JSON.parse(data)
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
       itineraryStore.fetchItineraries(props.itinerary.trip_id)
    }
  } catch (error) {
    console.error('Drop error:', error)
  }
}

function handleClick() {
    emit('click')
}

function handleEdit(activity: any) {
    emit('edit-activity', activity)
}

function handleAddActivity() {
    emit('add-activity', props.itinerary.id)
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
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.ghost-activity {
  opacity: 0.1;
  background-color: #3b82f6;
  border-radius: 1rem;
}

.drag-activity {
  opacity: 1 !important;
  transform: scale(1.02);
  background-color: #0a1224;
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 1rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  z-index: 50;
}
</style>

