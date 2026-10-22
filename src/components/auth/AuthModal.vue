<script setup lang="ts">
import { computed, ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { CheckCircleIcon, EnvelopeIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const authStore = useAuthStore()
const { showToast } = useToast()
const email = ref('')
const loading = ref(false)
const sent = ref(false)
const isValidEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))

async function handleMagicLink() {
  if (!isValidEmail.value) {
    showToast('請輸入有效的電子郵件', 'warning')
    return
  }
  try {
    loading.value = true
    await authStore.signInWithEmail(email.value.trim())
    sent.value = true
    showToast('登入連結已傳送至您的信箱', 'success')
  } catch (e: any) {
    showToast(e.message || '傳送失敗，請稍後再試', 'error')
  } finally {
    loading.value = false
  }
}

async function handleSocialLogin() {
  try {
    loading.value = true
    await authStore.signInWithOAuth('google')
  } catch (e: any) {
    console.error('OAuth login error:', e)
    showToast(e.message || 'Google 登入失敗，請稍後再試', 'error')
    loading.value = false
  }
}

function handleClose() {
  authStore.closeAuthModal()
  sent.value = false
  email.value = ''
  loading.value = false
}
</script>

<template>
  <TransitionRoot as="template" :show="authStore.showAuthModal">
    <Dialog as="div" class="relative z-[100]" @close="handleClose">
      <TransitionChild as="template" enter="ease-out duration-200" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-150" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-[#263331]/55 transition-opacity" />
      </TransitionChild>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="ease-out duration-200" enter-from="opacity-0 translate-y-3" enter-to="opacity-100 translate-y-0" leave="ease-in duration-150" leave-from="opacity-100 translate-y-0" leave-to="opacity-0 translate-y-3">
            <DialogPanel class="auth-panel relative w-full max-w-[360px] overflow-y-auto rounded-[24px] border border-[#DDE3DE] bg-white p-6 text-left shadow-[0_20px_60px_rgba(38,51,49,0.18)] sm:p-7">
              <button type="button" class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-[#7A8783] hover:bg-[#F7F8F6]" aria-label="關閉登入視窗" @click="handleClose">
                <XMarkIcon class="h-5 w-5" aria-hidden="true" />
              </button>
              <div class="mb-6 pr-10">
                <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#E5EBDF] text-[#397D86]" aria-hidden="true">
                  <span class="text-xl font-semibold leading-none">✦</span>
                </div>
                <DialogTitle as="h2" class="text-[23px] font-semibold leading-tight tracking-tight text-[#263331]">
                  {{ sent ? '登入連結已寄出' : '登入 TravelMate' }}
                </DialogTitle>
                <p class="mt-2 text-[13px] leading-[1.6] text-[#5F706B]">
                  {{ sent ? '請到信箱開啟登入連結，繼續旅程。' : '加入後一起整理行程、留言與準備事項。' }}
                </p>
              </div>
              <div v-if="sent" class="space-y-5">
                <div class="flex items-start gap-3 rounded-[14px] border border-[#DDE3DE] bg-[#F7F8F6] p-4">
                  <CheckCircleIcon class="h-6 w-6 shrink-0 text-[#397D86]" aria-hidden="true" />
                  <div class="min-w-0">
                    <p class="text-[13px] font-semibold text-[#263331]">請檢查電子郵件</p>
                    <p class="mt-1 break-all text-[13px] text-[#5F706B]">{{ email }}</p>
                  </div>
                </div>
                <button type="button" class="text-[13px] font-semibold text-[#397D86] hover:underline" @click="sent = false">更換電子郵件</button>
              </div>
              <div v-else>
                <form class="space-y-4" @submit.prevent="handleMagicLink">
                  <div>
                    <label for="auth-email" class="mb-2 block text-[13px] font-semibold text-[#263331]">電子郵件</label>
                    <div class="relative">
                      <EnvelopeIcon class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7A8783]" aria-hidden="true" />
                      <input id="auth-email" v-model="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" class="block min-h-[48px] w-full rounded-[12px] border border-[#DDE3DE] bg-[#F7F8F6] py-3 pl-12 pr-4 text-[14px] text-[#263331] placeholder:text-[#7A8783]" />
                    </div>
                  </div>
                  <button type="submit" :disabled="loading || !isValidEmail" class="flex min-h-[48px] w-full items-center justify-center rounded-[12px] bg-[#397D86] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#316E76] disabled:cursor-not-allowed disabled:bg-[#E5EBDF] disabled:text-[#5F706B]">
                    {{ loading ? '處理中…' : '發送登入連結' }}
                  </button>
                </form>
                <div class="my-5 flex items-center gap-3 text-[12px] text-[#7A8783]">
                  <span class="h-px flex-1 bg-[#DDE3DE]" /><span>或使用</span><span class="h-px flex-1 bg-[#DDE3DE]" />
                </div>
                <button type="button" :disabled="loading" class="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-[12px] border border-[#DDE3DE] bg-white px-4 text-[14px] font-semibold text-[#263331] hover:bg-[#F7F8F6] disabled:cursor-not-allowed disabled:opacity-60" @click="handleSocialLogin">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  使用 Google 登入
                </button>
              </div>
              <p class="mt-6 border-t border-[#DDE3DE] pt-4 text-[12px] leading-[1.6] text-[#5F706B]">透過邀請連結認領身分後，即可使用共同編輯與私人內容。</p>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
.auth-panel { max-height: calc(100dvh - 32px); }
.auth-panel :is(button, input):focus-visible { outline: 3px solid #83b3b6; outline-offset: 3px; }
</style>
