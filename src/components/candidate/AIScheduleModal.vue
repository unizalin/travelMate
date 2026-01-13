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
        <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-md transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-[3rem] bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
              <!-- AI Sparkle Background -->
              <div class="absolute top-0 right-0 p-8 opacity-5">
                <SparklesIcon class="w-48 h-48 text-primary-600" />
              </div>

              <div class="p-8 sm:p-12 relative">
                <!-- Header -->
                <div class="flex justify-between items-start mb-10">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-200">
                      <SparklesIcon class="w-8 h-8" />
                    </div>
                    <div>
                      <DialogTitle as="h3" class="text-3xl font-black text-secondary-900 tracking-tight">AI 智能排程建議</DialogTitle>
                      <p class="text-xs font-black text-primary-500 uppercase tracking-[0.3em] mt-1">Smart Scheduling</p>
                    </div>
                  </div>
                  <button @click="emit('close')" class="w-10 h-10 rounded-full hover:bg-secondary-50 flex items-center justify-center transition-colors">
                    <XMarkIcon class="w-6 h-6 text-secondary-400" />
                  </button>
                </div>

                <!-- Suggestions List -->
                <div class="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div 
                    v-for="(suggestion, index) in suggestions" 
                    :key="index"
                    class="bg-secondary-50/50 rounded-2xl p-6 border border-secondary-100/50 hover:bg-white hover:shadow-xl hover:border-primary-100 transition-all group"
                  >
                    <div class="flex justify-between items-start mb-4">
                      <div class="space-y-1">
                        <h4 class="font-black text-secondary-900 text-lg tracking-tight group-hover:text-primary-600 transition-colors">
                          {{ getCandidateName(suggestion.candidateId) }}
                        </h4>
                        <p class="text-xs font-bold text-secondary-400">📍 {{ getCandidateLocation(suggestion.candidateId) }}</p>
                      </div>
                      <div class="flex flex-col items-end gap-1">
                        <div class="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-secondary-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-secondary-700">
                          <CalendarIcon class="w-3.5 h-3.5 text-primary-500" />
                          第 {{ suggestion.dayNumber }} 天
                        </div>
                        <div class="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-secondary-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-secondary-700">
                          <ClockIcon class="w-3.5 h-3.5 text-indigo-500" />
                          {{ suggestion.startTime }}
                        </div>
                      </div>
                    </div>
                    <div class="bg-white rounded-xl p-4 border border-secondary-50 text-xs font-medium text-secondary-500 leading-relaxed italic">
                      "{{ suggestion.reasoning }}"
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="mt-12 flex gap-4">
                  <button 
                    @click="emit('close')"
                    class="flex-1 px-8 py-5 rounded-2xl text-sm font-black text-secondary-400 hover:text-secondary-600 hover:bg-secondary-50 transition-all uppercase tracking-widest"
                  >
                    再想想
                  </button>
                  <button 
                    @click="emit('apply', suggestions)"
                    class="flex-[2] bg-secondary-900 hover:bg-black text-white px-8 py-5 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-secondary-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <CheckIcon class="w-5 h-5 text-primary-400 stroke-[4]" />
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
  background: #E2E8F0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #CBD5E1;
}
</style>
