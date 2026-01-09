<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { ShareIcon, DocumentDuplicateIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { ref, watch } from 'vue';
import { shareService } from '@/services/shareService';

const props = defineProps<{
  isOpen: boolean;
  tripId: string;
  tripName: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const shareUrl = ref('');
const qrCodeDataUrl = ref('');
const isCopied = ref(false);
const isLoading = ref(true);

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    isLoading.value = true;
    shareUrl.value = shareService.generateShareUrl(props.tripId);
    try {
      qrCodeDataUrl.value = await shareService.generateQrCode(shareUrl.value);
    } catch (err) {
      console.error('Failed to load QR code', err);
    } finally {
      isLoading.value = false;
    }
  }
});

const handleCopy = async () => {
  try {
    await shareService.copyToClipboard(shareUrl.value);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (err) {
    // Error notification handled by service or useToast if needed
  }
};
</script>

<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-50" @close="emit('close')">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div class="flex justify-between items-center mb-4">
                  <div class="flex items-center gap-3">
                    <div class="bg-blue-100 p-2 rounded-lg">
                      <ShareIcon class="h-6 w-6 text-blue-600" aria-hidden="true" />
                    </div>
                    <DialogTitle as="h3" class="text-lg font-bold leading-6 text-gray-900">
                      分享旅程
                    </DialogTitle>
                  </div>
                  <button @click="emit('close')" class="text-gray-400 hover:text-gray-500">
                    <XMarkIcon class="h-6 w-6" />
                  </button>
                </div>

                <div class="mt-4 space-y-6">
                  <div class="text-center">
                    <p class="text-sm text-gray-500 mb-4">
                      正式邀請他人查看「<span class="font-semibold text-gray-900">{{ tripName }}</span>」的行程。
                    </p>
                    
                    <!-- QR Code Area -->
                    <div class="inline-block p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                      <div v-if="isLoading" class="w-48 h-48 flex items-center justify-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                      <img v-else :src="qrCodeDataUrl" alt="Share QR Code" class="w-48 h-48 mx-auto" />
                    </div>
                    <p class="mt-2 text-xs text-gray-400">掃描 QR Code 或複製下方連結</p>
                  </div>

                  <!-- Link Copy Area -->
                  <div>
                    <label for="share-url" class="block text-sm font-medium text-gray-700 mb-1">分享連結</label>
                    <div class="flex gap-2">
                      <input
                        type="text"
                        name="share-url"
                        id="share-url"
                        readonly
                        :value="shareUrl"
                        class="block w-full rounded-lg border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 focus:outline-none"
                      />
                      <button
                        @click="handleCopy"
                        :class="[
                          'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95',
                          isCopied ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                        ]"
                      >
                        <component :is="isCopied ? CheckIcon : DocumentDuplicateIcon" class="h-4 w-4" />
                        {{ isCopied ? '已複製' : '複製' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-gray-50 px-4 py-4 sm:px-6">
                <button
                  type="button"
                  class="w-full inline-flex justify-center rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  @click="emit('close')"
                >
                  關閉
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
