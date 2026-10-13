<template>
  <div 
    @click="handleClick"
    class="group relative overflow-hidden rounded-[3rem] bg-secondary-900/40 backdrop-blur-3xl border border-white/5 hover:border-primary-500/50 transition-all duration-700 cursor-pointer flex flex-col h-full shadow-[0_30px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
  >
    <!-- Header: Glossy Banner -->
    <div class="relative h-32 flex-shrink-0 overflow-hidden bg-[#050b18]">
      <!-- Sophisticated Mesh Gradient Background -->
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#3b82f644_0%,transparent_70%)] opacity-80 animate-pulse-slow"></div>
      <div class="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(2,6,23,0.9))]"></div>
      <div class="absolute inset-0 bg-[size:20px_20px] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]"></div>
      
      <!-- Content -->
      <div class="absolute inset-0 p-8 flex flex-col justify-between z-10">
        <div class="flex justify-between w-full items-start">
          <div class="bg-black/40 backdrop-blur-2xl px-4 py-1.5 rounded-2xl border border-white/10 shadow-2xl">
            <span class="text-white text-[9px] font-black uppercase tracking-[0.3em] text-primary-400">Day {{ itinerary.day_number }}</span>
          </div>
          <WeatherTooltip :weather="weather" class="text-white drop-shadow-2xl scale-110" />
        </div>

        <div class="w-full flex justify-between items-end">
          <div>
            <h3 class="text-2xl font-black text-white tracking-tighter leading-none mb-2 drop-shadow-2xl uppercase">
              {{ itinerary.title || '開啟精彩旅程' }}
            </h3>
            <p class="text-[9px] font-black text-white/30 tracking-[0.3em] uppercase">
              {{ formattedDate }}
            </p>
          </div>
          <div class="flex items-center gap-3 px-4 py-2 bg-primary-500/10 backdrop-blur-3xl rounded-2xl border border-primary-500/20 shadow-2xl transition-all group-hover:bg-primary-500 group-hover:border-primary-400">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse group-hover:bg-white"></div>
            <span class="text-[9px] font-black text-primary-400 uppercase tracking-widest group-hover:text-white">{{ activityCount }} 個行程</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Body: Activity List -->
    <div 
      class="flex-1 p-8 flex flex-col relative z-10 bg-transparent"
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
        class="flex-1 space-y-6 overflow-y-auto no-scrollbar pr-1 min-h-[140px]"
        @change="onActivitiesChange"
        @start="isDragging = true"
        @end="onDragEnd"
      >
        <template #item="{ element: activity, index: idx }">
          <div 
            class="relative flex items-start gap-5 group/item cursor-move active:cursor-grabbing scale-100 hover:scale-[1.02] transition-transform"
          >
            <!-- Connection Line -->
            <div 
              v-if="(idx as number) < localActivities.length - 1"
              class="absolute left-3 top-8 bottom-[-24px] w-0.5 bg-white/5 group-hover/item:bg-primary-500/30 transition-colors"
            ></div>

            <!-- Connector Dot -->
            <div class="flex flex-col items-center flex-shrink-0 pt-2">
              <div 
                class="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black z-10 transition-all duration-500"
                :class="(idx as number) === 0 ? 'bg-primary-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-white/5 border border-white/10 text-white/30 group-hover/item:border-primary-500/50 group-hover/item:text-white'"
              >
                {{ (idx as number) + 1 }}
              </div>
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0 pb-2">
              <div class="flex justify-between items-start mb-1">
                <span class="text-[8px] font-black text-white/10 uppercase tracking-[0.4em] group-hover/item:text-primary-400/50">Itinerary {{ (idx as number) + 1 }}</span>
                <button 
                  @click.stop="handleEdit(activity)"
                  class="p-1.5 rounded-xl hover:bg-white/10 transition-all text-white/10 hover:text-white opacity-0 group-hover/item:opacity-100"
                >
                  <PencilIcon class="w-3.5 h-3.5" />
                </button>
              </div>
              <h4 class="text-sm font-black text-white/70 group-hover/item:text-white transition-colors truncate uppercase tracking-tight">
                {{ activity.name }}
              </h4>
              <div v-if="activity.start_time" class="flex items-center gap-2 mt-2">
                <div class="w-1 h-1 rounded-full bg-primary-500/40 animate-pulse"></div>
                <p class="text-[10px] text-white/30 font-black tracking-[0.2em] uppercase">
                  {{ formatTime(activity.start_time) }}
                </p>
              </div>
            </div>
          </div>
        </template>

        <template #footer>
          <!-- Empty State -->
          <div v-if="localActivities.length === 0" class="py-16 flex flex-col items-center text-center animate-fade-in">
            <div class="w-16 h-16 bg-white/5 text-white/5 rounded-[1.5rem] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
              <MapPinIcon class="w-8 h-8 opacity-20" />
            </div>
            <p class="text-[10px] text-white/20 font-black uppercase tracking-[0.5em]">尚未規劃今日行程</p>
          </div>
        </template>
      </draggable>

      <!-- Add Button -->
      <button 
        @click.stop="handleAddActivity"
        class="mt-8 w-full py-5 bg-white/5 border border-white/10 rounded-[2rem] text-white/20 hover:border-primary-500/50 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-4 group/add shadow-2xl ring-1 ring-white/5 active:scale-95"
      >
        <PlusIcon class="w-5 h-5 transition-transform group-hover/add:rotate-180" />
        <span class="text-[10px] font-black uppercase tracking-[0.4em]">新增行程景點</span>
      </button>
    </div>

    <!-- Active Interface Layer -->
    <div class="absolute inset-0 border border-white/5 rounded-[3rem] pointer-events-none group-hover:border-primary-500/30 transition-all z-30 ring-1 ring-inset ring-white/5"></div>
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

