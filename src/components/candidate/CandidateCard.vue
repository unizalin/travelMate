<script setup lang="ts">
import { ref } from 'vue'
import { candidateService, type CandidateActivity } from '@/services/candidateService'
import { 
  HeartIcon as HeartOutline,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  UserIcon
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
    class="group relative bg-white dark:bg-white/5 backdrop-blur-3xl rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 hover:border-primary-500/50 transition-all duration-500 cursor-grab active:cursor-grabbing shadow-lg dark:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-1 overflow-hidden"
  >
    <!-- Status Badge -->
    <div 
      v-if="candidate.status === 'added'"
      class="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest z-10 shadow-lg shadow-emerald-500/20"
    >
      已部署
    </div>

    <!-- Data Node Decoration -->
    <div class="absolute -top-4 -left-4 w-12 h-12 bg-primary-500/10 blur-2xl rounded-full group-hover:bg-primary-500/30 transition-colors"></div>

    <div class="flex flex-col h-full gap-5 relative z-10">
      <!-- Content -->
      <div class="space-y-3">
        <h4 class="text-xl font-black text-slate-900 dark:text-white leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
          {{ candidate.name }}
        </h4>
        <div class="flex items-center gap-2 text-slate-400 dark:text-white/40 text-[10px] font-black uppercase tracking-widest">
            <div class="p-1 bg-slate-100 dark:bg-white/5 rounded-lg">
                <MapPinIcon class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            </div>
            <span class="truncate">{{ candidate.location }}</span>
        </div>
      </div>

      <!-- Description -->
      <div class="relative">
          <p class="text-xs text-slate-500 dark:text-white/60 font-medium leading-relaxed line-clamp-2 italic pl-4 border-l border-slate-200 dark:border-white/10">
            {{ candidate.description || '目的地描述載入中...' }}
          </p>
      </div>

      <!-- Meta Info -->
      <div class="flex items-center justify-between mt-auto pt-5 border-t border-slate-100 dark:border-white/5">
        <div class="flex items-center gap-3">
          <!-- Creator -->
          <div class="flex items-center gap-2" :title="candidate.creator?.display_name">
            <div class="w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
                <img 
                  v-if="candidate.creator?.avatar_url"
                  :src="candidate.creator?.avatar_url"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full bg-slate-100 dark:bg-secondary-800 flex items-center justify-center">
                    <UserIcon class="w-3 h-3 text-slate-400 dark:text-white/40" />
                </div>
            </div>
            <span class="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest truncate max-w-[80px]">
                {{ candidate.creator?.display_name || 'Anonymous' }}
            </span>
          </div>
        </div>

        <!-- Like Button -->
        <button 
          @click.stop="handleLike"
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border border-slate-100 dark:border-white/5 hover:border-primary-200 dark:hover:border-white/10"
          :class="isLikedByMe ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500 shadow-sm' : 'bg-slate-50 dark:bg-transparent text-slate-400 dark:text-white/20 hover:text-slate-600 dark:hover:text-white/60'"
        >
          <HeartSolid v-if="isLikedByMe" class="w-4 h-4 animate-pop-in" />
          <HeartOutline v-else class="w-4 h-4" />
          <span class="text-xs font-black">{{ currentLikeCount }}</span>
        </button>
      </div>

      <!-- Action Overlay (Hover Only) -->
      <div class="absolute inset-0 bg-white/95 dark:bg-[#050b18]/90 backdrop-blur-md flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 pointer-events-none group-hover:pointer-events-auto rounded-[2rem]">
        <button 
          @click="emit('add-to-itinerary', candidate)"
          class="bg-slate-900 dark:bg-white text-white dark:text-secondary-900 w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95"
          title="加入日程"
        >
          <PlusIcon class="w-7 h-7 stroke-[3]" />
        </button>
        <button 
          @click="emit('delete', candidate.id)"
          class="bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/10 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-500 hover:border-red-500/50 transition-all active:scale-95"
          title="刪除"
        >
          <TrashIcon class="w-6 h-6" />
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
