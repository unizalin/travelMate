<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { 
    ExclamationTriangleIcon, 
    InformationCircleIcon, 
    CheckCircleIcon, 
    XCircleIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline';
import { computed } from 'vue';

const props = defineProps<{
    isOpen: boolean
    title: string
    message: string
    type?: 'info' | 'success' | 'warning' | 'error'
    confirmText?: string
    cancelText?: string
}>()

const emit = defineEmits<{
    (e: 'confirm'): void
    (e: 'cancel'): void
}>()

const icons = {
    error: XCircleIcon,
    success: CheckCircleIcon,
    info: InformationCircleIcon,
    warning: ExclamationTriangleIcon
}

const colors = {
    error: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        icon: 'text-red-600 dark:text-red-400',
        button: 'bg-red-600 hover:bg-red-500 shadow-red-500/30'
    },
    success: {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        icon: 'text-emerald-600 dark:text-emerald-400',
        button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30'
    },
    info: {
        bg: 'bg-primary-50 dark:bg-primary-900/20',
        icon: 'text-primary-600 dark:text-primary-400',
        button: 'bg-primary-600 hover:bg-primary-500 shadow-primary-500/30'
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        icon: 'text-amber-600 dark:text-amber-400',
        button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/30'
    }
}

const activeType = computed(() => props.type || 'warning')
const activeColor = computed(() => colors[activeType.value])
const IconComponent = computed(() => icons[activeType.value])
</script>

<template>
    <TransitionRoot as="template" :show="isOpen">
        <Dialog as="div" class="relative z-50" @close="emit('cancel')">
            <!-- Backdrop -->
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
                leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
                <div class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity" />
            </TransitionChild>

            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                    <TransitionChild as="template" enter="ease-out duration-300"
                        enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
                        leave-from="opacity-100 translate-y-0 sm:scale-100"
                        leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                        <DialogPanel
                            class="relative transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-secondary-900 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-white/20 dark:border-secondary-800">
                            
                            <!-- Header Decor -->
                            <div class="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                <IconComponent class="w-48 h-48" />
                            </div>

                            <div class="p-8 sm:p-10">
                                <div class="flex flex-col items-center text-center">
                                    <!-- Icon -->
                                    <div :class="[activeColor.bg, 'flex h-16 w-16 items-center justify-center rounded-[1.25rem] mb-6 shadow-sm']">
                                        <IconComponent :class="[activeColor.icon, 'h-10 w-10']" />
                                    </div>

                                    <!-- Content -->
                                    <DialogTitle as="h3" class="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                        {{ title }}
                                    </DialogTitle>
                                    <p class="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm">
                                        {{ message }}
                                    </p>
                                </div>

                                <!-- Actions -->
                                <div class="mt-10 flex flex-col sm:flex-row-reverse gap-4">
                                    <button 
                                        type="button"
                                        :class="[activeColor.button, 'flex-1 py-4.5 px-6 rounded-2xl text-[10px] font-black text-white shadow-2xl transition-all active:scale-95 uppercase tracking-[0.2em]']"
                                        @click="emit('confirm')"
                                    >
                                        {{ confirmText || '確認' }}
                                    </button>
                                    <button 
                                        type="button"
                                        class="flex-1 py-4.5 px-6 rounded-2xl text-[10px] font-black text-gray-400 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5 transition-all uppercase tracking-[0.2em]"
                                        @click="emit('cancel')"
                                    >
                                        {{ cancelText || '取消' }}
                                    </button>
                                </div>
                            </div>

                            <!-- Top Close Button -->
                            <button @click="emit('cancel')" class="absolute top-6 right-6 w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 dark:text-white/20 transition-all">
                                <XMarkIcon class="w-6 h-6" />
                            </button>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>
