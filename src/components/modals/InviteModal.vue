<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { ref, computed } from 'vue';
import { 
  XMarkIcon, 
  LinkIcon, 
  ClipboardDocumentCheckIcon, 
  DocumentDuplicateIcon
} from '@heroicons/vue/24/outline';

const props = defineProps<{
  isOpen: boolean
  inviteCode: string
  tripId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const copiedCode = ref(false)
const copiedLink = ref(false)
const activeTab = ref<'link' | 'code'>('link')

// Compute full invite link
const inviteLink = computed(() => {
  return `${window.location.origin}/trips/${props.tripId}?invite=${props.inviteCode}`
})

async function copyText(text: string, type: 'code' | 'link') {
  try {
    await navigator.clipboard.writeText(text)
    if (type === 'code') {
      copiedCode.value = true
      setTimeout(() => copiedCode.value = false, 2000)
    } else {
      copiedLink.value = true
      setTimeout(() => copiedLink.value = false, 2000)
    }
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

function shareToSocial(platform: 'line' | 'facebook' | 'email') {
  const url = encodeURIComponent(inviteLink.value)
  const text = encodeURIComponent('加入我的旅程！')
  
  let shareUrl = ''
  switch (platform) {
    case 'line':
      shareUrl = `https://social-plugins.line.me/lineit/share?url=${url}`
      break
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`
      break
    case 'email':
      shareUrl = `mailto:?subject=${text}&body=${url}`
      break
  }
  
  window.open(shareUrl, '_blank', 'width=600,height=400')
}
</script>

<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="emit('close')" class="relative z-50">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95 translate-y-4"
            enter-to="opacity-100 scale-100 translate-y-0" leave="duration-200 ease-in" leave-from="opacity-100 scale-100 translate-y-0"
            leave-to="opacity-0 scale-95 translate-y-4">
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 md:p-8 text-left align-middle shadow-2xl transition-all relative">
              
              <!-- Close Button -->
              <button @click="emit('close')" class="absolute top-4 right-4 p-2 rounded-full text-secondary-400 hover:bg-secondary-50 hover:text-secondary-600 transition-colors">
                <XMarkIcon class="w-5 h-5" />
              </button>

              <!-- Header -->
              <div class="text-center mb-8">
                <div class="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-500 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
                    <path fill-rule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clip-rule="evenodd" />
                    <path d="M5.082 14.254a6.741 6.741 0 00-2.817.913 7.502 7.502 0 0110.437 0c-.995-.555-2.122-.89-3.32-.999a8.751 8.751 0 00-4.299.077z" />
                  </svg>
                </div>
                <DialogTitle as="h3" class="text-2xl font-black text-secondary-900 tracking-tight">
                  邀請成員
                </DialogTitle>
                <p class="mt-2 text-sm font-medium text-secondary-500">
                  分享此連結給朋友，讓他們加入這趟旅程
                </p>
              </div>

              <!-- Tabs -->
              <div class="flex p-1 bg-secondary-50 rounded-xl mb-6">
                <button
                  v-for="tab in ['link', 'code']"
                  :key="tab"
                  @click="activeTab = tab as any"
                  :class="[
                    'flex-1 py-2.5 text-sm font-bold rounded-lg transition-all',
                    activeTab === tab 
                      ? 'bg-white text-secondary-900 shadow-sm' 
                      : 'text-secondary-400 hover:text-secondary-600'
                  ]"
                >
                  {{ tab === 'link' ? '分享連結' : '邀請碼' }}
                </button>
              </div>

              <!-- Content Area -->
              <div class="mb-8">
                <div v-if="activeTab === 'link'" class="space-y-4">
                  <div class="relative group">
                    <input 
                      type="text" 
                      readonly 
                      :value="inviteLink"
                      class="block w-full py-4 pl-4 pr-32 bg-secondary-50 text-secondary-500 text-sm font-medium rounded-2xl border-2 border-transparent focus:border-primary-500 focus:bg-white outline-none transition-all truncate"
                    />
                    <div class="absolute inset-y-0 right-0 p-1.5 flex">
                      <button 
                        @click="copyText(inviteLink, 'link')"
                        class="px-4 h-full rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors shadow-lg shadow-primary-200/50 flex items-center gap-2"
                      >
                        <ClipboardDocumentCheckIcon v-if="copiedLink" class="w-4 h-4" />
                        <LinkIcon v-else class="w-4 h-4" />
                        <span>{{ copiedLink ? '已複製' : '複製' }}</span>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Social Share -->
                  <div class="grid grid-cols-3 gap-3">
                    <button @click="shareToSocial('line')" class="flex flex-col items-center justify-center gap-2 py-3 rounded-2xl bg-[#06C755]/10 text-[#06C755] hover:bg-[#06C755]/20 transition-colors">
                      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20.316,9.256c0.007-0.076,0.015-0.155,0.015-0.233c0-3.616-3.804-6.556-8.5-6.556S3.332,5.404,3.332,9.023 c0,3.221,2.993,5.922,7.108,6.467c0.276,0.06,0.654,0.183,0.749,0.419c0.086,0.215,0.057,0.551,0.026,0.768 c-0.084,0.559-0.54,2.203-0.578,2.336c-0.101,0.347-0.048,0.925,0.771,0.506c0.819-0.42,4.453-2.618,6.075-4.484 C19.333,12.915,20.322,11.164,20.316,9.256z"/></svg>
                      <span class="text-xs font-bold">LINE</span>
                    </button>
                    <button @click="shareToSocial('facebook')" class="flex flex-col items-center justify-center gap-2 py-3 rounded-2xl bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors">
                      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      <span class="text-xs font-bold">Facebook</span>
                    </button>
                    <button @click="shareToSocial('email')" class="flex flex-col items-center justify-center gap-2 py-3 rounded-2xl bg-secondary-100 text-secondary-600 hover:bg-secondary-200 transition-colors">
                      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/></svg>
                      <span class="text-xs font-bold">Email</span>
                    </button>
                  </div>
                </div>

                <div v-else class="space-y-6 text-center py-4">
                   <div 
                      @click="copyText(inviteCode, 'code')"
                      class="relative bg-secondary-900 text-white p-8 rounded-3xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group shadow-xl shadow-secondary-200"
                    >
                      <p class="text-secondary-400 text-xs font-bold uppercase tracking-widest mb-2">專屬邀請碼</p>
                      <p class="text-4xl font-mono font-black tracking-widest">{{ inviteCode }}</p>
                      <div class="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span class="text-[10px] font-bold text-secondary-400">{{ copiedCode ? '已複製' : '點擊複製' }}</span>
                         <DocumentDuplicateIcon class="w-4 h-4 text-secondary-400" />
                      </div>
                   </div>
                   <p class="text-xs text-secondary-400 font-medium">適合口頭告訴身邊的朋友</p>
                </div>
              </div>

              <!-- Footer Buttons -->
               <div class="pt-6 border-t border-secondary-100">
                  <button type="button"
                    class="w-full flex justify-center rounded-xl bg-secondary-900 px-4 py-4 text-sm font-bold text-white hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all shadow-lg active:scale-[0.98]"
                    @click="emit('close')">
                    完成
                  </button>
               </div>

            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
