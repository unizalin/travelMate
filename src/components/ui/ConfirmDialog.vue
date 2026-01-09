<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline';
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

const icon = computed(() => {
    switch (props.type) {
        case 'error': return XCircleIcon
        case 'success': return CheckCircleIcon
        case 'info': return InformationCircleIcon
        case 'warning': default: return ExclamationTriangleIcon
    }
})

const iconBgColor = computed(() => {
    switch (props.type) {
        case 'error': return 'bg-red-100'
        case 'success': return 'bg-green-100'
        case 'info': return 'bg-blue-100'
        case 'warning': default: return 'bg-yellow-100'
    }
})

const iconColor = computed(() => {
    switch (props.type) {
        case 'error': return 'text-red-600'
        case 'success': return 'text-green-600'
        case 'info': return 'text-blue-600'
        case 'warning': default: return 'text-yellow-600'
    }
})

const confirmButtonClass = computed(() => {
    switch (props.type) {
         case 'error': return 'bg-red-600 hover:bg-red-500 focus-visible:outline-red-600'
         case 'success': return 'bg-green-600 hover:bg-green-500 focus-visible:outline-green-600'
         case 'info': return 'bg-blue-600 hover:bg-blue-500 focus-visible:outline-blue-600'
         case 'warning': default: return 'bg-yellow-600 hover:bg-yellow-500 focus-visible:outline-yellow-600'
    }
})
</script>

<template>
    <TransitionRoot as="template" :show="isOpen">
        <Dialog as="div" class="relative z-50" @close="emit('cancel')">
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
                leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
                <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </TransitionChild>

            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <TransitionChild as="template" enter="ease-out duration-300"
                        enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
                        leave-from="opacity-100 translate-y-0 sm:scale-100"
                        leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                        <DialogPanel
                            class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                            <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                <div class="sm:flex sm:items-start">
                                    <div
                                        :class="[iconBgColor, 'mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10']">
                                        <component :is="icon" :class="[iconColor, 'h-6 w-6']" aria-hidden="true" />
                                    </div>
                                    <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">
                                            {{ title }}
                                        </DialogTitle>
                                        <div class="mt-2">
                                            <p class="text-sm text-gray-500">
                                                {{ message }}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button type="button"
                                    :class="[confirmButtonClass, 'inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:ml-3 sm:w-auto']"
                                    @click="emit('confirm')">
                                    {{ confirmText || '確認' }}
                                </button>
                                <button type="button"
                                    class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                    @click="emit('cancel')" ref="cancelButtonRef">
                                    {{ cancelText || '取消' }}
                                </button>
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>
