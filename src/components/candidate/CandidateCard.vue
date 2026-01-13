<script setup lang="ts">
import { ref } from 'vue'
import { candidateService, type CandidateActivity } from '@/services/candidateService'
import { 
  HeartIcon as HeartOutline,
  MapPinIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import { HeartIcon as HeartSolid } from '@heroicons/vue/24/solid'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  candidate: CandidateActivity
}>()

const emit = defineEmits<{
  (e: 'update'): void
  (e: 'add-to-itinerary', candidate: CandidateActivity): void
  (e: 'delete', id: string): void
}>()

const authStore = useAuthStore()
const isLiking = ref(false)

const isLikedByMe = ref(
  props.candidate.likes?.some(l => l.user_id === authStore.user?.id) || false
)

const currentLikeCount = ref(props.candidate.like_count || 0)

async function handleLike() {
  if (isLiking.value || !authStore.user) return
  
  try {
    isLiking.value = true
    const liked = await candidateService.toggleLike(props.candidate.id)
    isLikedByMe.value = liked
    currentLikeCount.value += liked ? 1 : -1
  } finally {
    isLiking.value = false
  }
}

const handleDragStart = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', JSON.stringify(props.candidate))
    e.dataTransfer.effectAllowed = 'copy'
  }
}
</script>

<template>
  <div 
    draggable="true"
    @dragstart="handleDragStart"
    class="group bg-white rounded-3xl p-5 shadow-sm border border-secondary-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-grab active:cursor-grabbing"
  >
    <!-- Status Badge -->
    <div 
      v-if="candidate.status === 'added'"
      class="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest z-10"
    >
      已加入
    </div>

    <div class="flex flex-col h-full gap-4">
      <!-- Content -->
      <div class="space-y-2">
        <h4 class="text-lg font-black text-secondary-900 leading-tight group-hover:text-primary-600 transition-colors">
          {{ candidate.name }}
        </h4>
        <div class="flex items-center gap-1.5 text-secondary-400 text-xs font-bold">
          <MapPinIcon class="w-3.5 h-3.5" />
          <span class="truncate">{{ candidate.location }}</span>
        </div>
      </div>

      <!-- Description -->
      <p class="text-xs text-secondary-500 font-medium leading-relaxed line-clamp-2 italic">
        "{{ candidate.description || '沒寫原因，但就是想去！' }}"
      </p>

      <!-- Meta Info -->
      <div class="flex items-center justify-between mt-auto pt-4 border-t border-secondary-50">
        <div class="flex items-center gap-3">
          <!-- Creator -->
          <div class="flex items-center gap-1.5" :title="candidate.creator?.display_name">
            <img 
              :src="candidate.creator?.avatar_url || 'https://via.placeholder.com/24'"
              class="w-5 h-5 rounded-full object-cover ring-1 ring-secondary-100"
            />
          </div>
        </div>

        <!-- Like Button -->
        <button 
          @click.stop="handleLike"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all group/like"
          :class="isLikedByMe ? 'bg-rose-50 text-rose-500' : 'hover:bg-secondary-50 text-secondary-300 hover:text-secondary-500'"
        >
          <HeartSolid v-if="isLikedByMe" class="w-4 h-4 animate-pop-in" />
          <HeartOutline v-else class="w-4 h-4 group-hover/like:scale-110 transition-transform" />
          <span class="text-xs font-black">{{ currentLikeCount }}</span>
        </button>
      </div>

      <!-- Action Overlay (Hover Only) -->
      <div class="absolute inset-0 bg-primary-600/90 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none group-hover:pointer-events-auto">
        <button 
          @click="emit('add-to-itinerary', candidate)"
          class="bg-white text-primary-600 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
          title="加入日程"
        >
          <PlusIcon class="w-6 h-6 stroke-[3]" />
        </button>
        <button 
          @click="emit('delete', candidate.id)"
          class="bg-white/20 text-white w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-red-500 transition-colors active:scale-95"
          title="刪除"
        >
          <TrashIcon class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pop-in {
  0% { transform: scale(0.8); opacity: 0; }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
.animate-pop-in {
  animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
</style>
