<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { CalendarIcon, XMarkIcon } from '@heroicons/vue/24/outline'

defineProps<{
  isOpen: boolean
  totalDays: number
  candidateName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', day: number): void
}>()

function handleSelect(day: number) {
  emit('select', day)
  emit('close')
}
</script>

<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-50" @close="emit('close')">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-[2.5rem] bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              <div class="p-8">
                <!-- Header -->
                <div class="flex justify-between items-start mb-8">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
                      <CalendarIcon class="w-7 h-7" />
                    </div>
                    <div>
                      <DialogTitle as="h3" class="text-xl font-black text-secondary-900 tracking-tight">將 {{ candidateName }} 加入行程</DialogTitle>
                      <p class="text-xs font-black text-secondary-400 uppercase tracking-widest mt-1">Select A Day</p>
                    </div>
                  </div>
                  <button @click="emit('close')" class="w-8 h-8 rounded-full hover:bg-secondary-50 flex items-center justify-center transition-colors">
                    <XMarkIcon class="w-5 h-5 text-secondary-400" />
                  </button>
                </div>

                <!-- Grid of Days -->
                <div class="grid grid-cols-4 gap-4">
                  <button 
                    v-for="day in totalDays" 
                    :key="day"
                    @click="handleSelect(day)"
                    class="group flex flex-col items-center justify-center p-4 rounded-2xl bg-secondary-50 hover:bg-primary-600 hover:text-white transition-all active:scale-95 border border-transparent hover:border-primary-500 shadow-sm hover:shadow-xl hover:shadow-primary-100"
                  >
                    <span class="text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 mb-1">Day</span>
                    <span class="text-xl font-black">{{ day }}</span>
                  </button>
                </div>

                <div class="mt-8 text-center">
                  <p class="text-[10px] font-black text-secondary-300 uppercase tracking-[0.2em]">或直接在「行程」分頁拖曳景點卡片</p>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
