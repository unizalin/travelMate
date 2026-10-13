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
        <div class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity" />
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
            <DialogPanel class="relative transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-secondary-950 text-left shadow-2xl border border-gray-100 dark:border-white/5 transition-all sm:my-8 sm:w-full sm:max-w-md">
              <div class="px-6 pb-4 pt-5 sm:p-8 transition-colors">
                <div class="flex justify-between items-center mb-6">
                  <div class="flex items-center gap-3">
                    <div class="bg-primary-50 dark:bg-primary-900/20 p-2.5 rounded-xl transition-colors">
                      <ShareIcon class="h-6 w-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                    </div>
                    <DialogTitle as="h3" class="text-2xl font-black leading-6 text-gray-900 dark:text-white tracking-tight transition-colors">
                      分享旅程
                    </DialogTitle>
                  </div>
                  <button @click="emit('close')" class="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 dark:text-white/20 transition-all">
                    <XMarkIcon class="h-6 w-6" />
                  </button>
                </div>

                <div class="mt-4 space-y-6">
                  <div class="text-center">
                    <p class="text-sm font-medium text-gray-400 dark:text-white/30 mb-8 transition-colors px-4">
                      正式邀請他人查看「<span class="font-black text-gray-900 dark:text-white">{{ tripName }}</span>」的行程。
                    </p>
                    
                    <!-- QR Code Area -->
                    <div class="inline-block p-6 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl transition-colors shadow-inner">
                      <div v-if="isLoading" class="w-48 h-48 flex items-center justify-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      </div>
                      <img v-else :src="qrCodeDataUrl" alt="Share QR Code" class="w-48 h-48 mx-auto dark:invert dark:opacity-90" />
                    </div>
                    <p class="mt-4 text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest transition-colors">掃描 QR Code 或複製下方連結</p>
                  </div>

                  <!-- Link Copy Area -->
                  <div>
                    <label for="share-url" class="block text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest mb-1.5 px-1 transition-colors">分享連結</label>
                    <div class="flex gap-2">
                      <input
                        type="text"
                        name="share-url"
                        id="share-url"
                        readonly
                        :value="shareUrl"
                        class="block w-full rounded-2xl bg-gray-50 dark:bg-white/5 border-none px-4 py-4 text-sm font-bold text-gray-900 dark:text-white transition-all outline-none truncate"
                      />
                      <button
                        @click="handleCopy"
                        :class="[
                          'flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl',
                          isCopied 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/5' 
                            : 'bg-primary-600 text-white hover:bg-primary-500 shadow-primary-500/20'
                        ]"
                      >
                        <component :is="isCopied ? CheckIcon : DocumentDuplicateIcon" class="h-4 w-4" />
                        <span>{{ isCopied ? '已複製' : '複製' }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="px-6 py-6 sm:px-8 border-t border-gray-50 dark:border-white/5 transition-colors">
                <button
                  type="button"
                  class="w-full flex justify-center rounded-2xl bg-gray-900 dark:bg-white px-4 py-4 text-[10px] font-black uppercase tracking-widest text-white dark:text-gray-900 hover:opacity-90 transition-all shadow-xl active:scale-[0.98]"
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
