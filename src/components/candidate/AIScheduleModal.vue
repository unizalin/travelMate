<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { SparklesIcon, XMarkIcon, CheckIcon, CalendarIcon, ClockIcon } from '@heroicons/vue/24/outline'
import type { SchedulingSuggestion } from '@/services/aiSchedulingService'
import type { CandidateActivity } from '@/services/candidateService'

const props = defineProps<{
  isOpen: boolean
  suggestions: SchedulingSuggestion[]
  candidates: CandidateActivity[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'apply', suggestions: SchedulingSuggestion[]): void
}>()

function getCandidateName(id: string) {
  return props.candidates.find(c => c.id === id)?.name || '未知景點'
}

function getCandidateLocation(id: string) {
  return props.candidates.find(c => c.id === id)?.location || ''
}
</script>

<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-50" @close="emit('close')">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-[3rem] bg-white dark:bg-secondary-950 text-left shadow-2xl border border-gray-100 dark:border-white/5 transition-all sm:my-8 sm:w-full sm:max-w-xl">
              <!-- AI Sparkle Background -->
              <div class="absolute top-0 right-0 p-8 opacity-5 transition-opacity">
                <SparklesIcon class="w-48 h-48 text-primary-600 dark:text-primary-500" />
              </div>

              <div class="p-8 sm:p-12 relative">
                <!-- Header -->
                <div class="flex justify-between items-start mb-10 transition-colors">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                      <SparklesIcon class="w-8 h-8" />
                    </div>
                    <div>
                      <DialogTitle as="h3" class="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight transition-colors">AI 智能排程建議</DialogTitle>
                      <p class="text-[10px] font-black text-primary-500 uppercase tracking-[0.3em] mt-1 transition-colors">Smart Scheduling</p>
                    </div>
                  </div>
                  <button @click="emit('close')" class="w-10 h-10 rounded-full hover:bg-gray-50 dark:hover:bg-white/10 flex items-center justify-center transition-all">
                    <XMarkIcon class="w-6 h-6 text-gray-400 dark:text-white/20" />
                  </button>
                </div>

                <!-- Suggestions List -->
                <div class="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar transition-colors">
                  <div 
                    v-for="(suggestion, index) in suggestions" 
                    :key="index"
                    class="bg-gray-50/50 dark:bg-white/5 rounded-2xl p-6 border border-gray-100/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-xl hover:border-primary-100 dark:hover:border-primary-500/30 transition-all group"
                  >
                    <div class="flex justify-between items-start mb-4">
                      <div class="space-y-1">
                        <h4 class="font-black text-gray-900 dark:text-white text-lg tracking-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {{ getCandidateName(suggestion.candidateId) }}
                        </h4>
                        <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/20 transition-colors">📍 {{ getCandidateLocation(suggestion.candidateId) }}</p>
                      </div>
                      <div class="flex flex-col items-end gap-1">
                        <div class="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10 shadow-sm text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-white/60 transition-colors">
                          <CalendarIcon class="w-3.5 h-3.5 text-primary-500" />
                          第 {{ suggestion.dayNumber }} 天
                        </div>
                        <div class="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10 shadow-sm text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-white/60 transition-colors">
                          <ClockIcon class="w-3.5 h-3.5 text-indigo-500" />
                          {{ suggestion.startTime }}
                        </div>
                      </div>
                    </div>
                    <div class="bg-gray-100 dark:bg-secondary-900/50 rounded-xl p-4 border border-gray-50 dark:border-white/5 text-xs font-medium text-gray-500 dark:text-white/40 leading-relaxed italic transition-colors">
                      "{{ suggestion.reasoning }}"
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="mt-12 flex gap-4 transition-colors">
                  <button 
                    @click="emit('close')"
                    class="flex-1 px-8 py-5 rounded-2xl text-[10px] font-black text-gray-400 dark:text-white/20 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all uppercase tracking-widest"
                  >
                    再想想
                  </button>
                  <button 
                    @click="emit('apply', suggestions)"
                    class="flex-[2] bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-gray-900 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-gray-900/20 dark:shadow-white/10 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <CheckIcon class="w-5 h-5 text-primary-400 dark:text-primary-600 stroke-[4]" />
                    套用全部建議
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
