<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { 
    CheckCircleIcon, 
    InformationCircleIcon, 
    ExclamationTriangleIcon,
    XMarkIcon 
} from '@heroicons/vue/24/outline';
import { computed, watch } from 'vue';

const props = defineProps<{
    isOpen: boolean
    title: string
    message: string
    type?: 'info' | 'success' | 'warning'
    autoClose?: boolean
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

const icons = {
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
}

const colors = {
    success: {
        bg: 'bg-emerald-50',
        icon: 'text-emerald-600',
        button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-200'
    },
    info: {
        bg: 'bg-primary-50',
        icon: 'text-primary-600',
        button: 'bg-primary-600 hover:bg-primary-500 shadow-primary-200'
    },
    warning: {
        bg: 'bg-amber-50',
        icon: 'text-amber-600',
        button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-200'
    }
}

const activeType = computed(() => props.type || 'info')
const activeColor = computed(() => colors[activeType.value])
const IconComponent = computed(() => icons[activeType.value])

watch(() => props.isOpen, (newVal) => {
    if (newVal && props.autoClose !== false) {
        setTimeout(() => {
            emit('close')
        }, 3000)
    }
})
</script>

<template>
    <TransitionRoot as="template" :show="isOpen">
        <Dialog as="div" class="relative z-50" @close="emit('close')">
            <!-- Backdrop -->
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
                leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
                <div class="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm transition-opacity" />
            </TransitionChild>

            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                    <TransitionChild as="template" enter="ease-out duration-300"
                        enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
                        leave-from="opacity-100 translate-y-0 sm:scale-100"
                        leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                        <DialogPanel
                            class="relative transform overflow-hidden rounded-[2.5rem] bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                            
                            <!-- Header Decor -->
                            <div class="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                <IconComponent class="w-48 h-48" />
                            </div>

                            <div class="p-8 sm:p-10">
                                <div class="flex flex-col items-center text-center">
                                    <div :class="[activeColor.bg, 'flex h-16 w-16 items-center justify-center rounded-[1.25rem] mb-6 shadow-sm']">
                                        <IconComponent :class="[activeColor.icon, 'h-10 w-10']" />
                                    </div>

                                    <DialogTitle as="h3" class="text-2xl font-black text-secondary-900 tracking-tight mb-2">
                                        {{ title }}
                                    </DialogTitle>
                                    <p class="text-sm font-bold text-secondary-500 leading-relaxed max-w-sm">
                                        {{ message }}
                                    </p>
                                </div>

                                <div class="mt-10">
                                    <button 
                                        type="button"
                                        :class="[activeColor.button, 'w-full py-4 px-6 rounded-2xl text-base font-black text-white shadow-xl transition-all active:scale-95 uppercase tracking-widest']"
                                        @click="emit('close')"
                                    >
                                        確定
                                    </button>
                                </div>
                            </div>

                            <button @click="emit('close')" class="absolute top-6 right-6 w-10 h-10 rounded-full hover:bg-secondary-50 flex items-center justify-center transition-colors">
                                <XMarkIcon class="w-6 h-6 text-secondary-300" />
                            </button>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>
