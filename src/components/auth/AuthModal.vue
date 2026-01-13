<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { 
  XMarkIcon, 
  EnvelopeIcon, 
  SparklesIcon, 
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const authStore = useAuthStore()
const { showToast } = useToast()

const email = ref('')
const loading = ref(false)
const sent = ref(false)

const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})

async function handleMagicLink() {
  if (!isValidEmail.value) {
    showToast('請輸入有效的電子郵件', 'warning')
    return
  }

  try {
    loading.value = true
    await authStore.signInWithEmail(email.value)
    sent.value = true
    showToast('登入連結已傳送至您的信箱', 'success')
  } catch (e: any) {
    showToast(e.message || '傳送失敗，請稍後再試', 'error')
  } finally {
    loading.value = false
  }
}


async function handleSocialLogin(provider: 'google' | 'facebook') {
  try {
    loading.value = true
    await authStore.signInWithOAuth(provider)
  } catch (e: any) {
    showToast(e.message || '登入失敗', 'error')
    loading.value = false
  }
}

function handleClose() {
  // If we want to force login, we can prevent closing
  // For now, let's allow closing but keep the redirected path
  authStore.closeAuthModal()
  sent.value = false
  email.value = ''
}
</script>

<template>
  <TransitionRoot as="template" :show="authStore.showAuthModal">
    <Dialog as="div" class="relative z-[100]" @close="handleClose">
      <TransitionChild 
        as="template" 
        enter="ease-out duration-500" 
        enter-from="opacity-0" 
        enter-to="opacity-100" 
        leave="ease-in duration-300" 
        leave-from="opacity-100" 
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-md transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <TransitionChild 
            as="template" 
            enter="ease-out duration-500" 
            enter-from="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95" 
            enter-to="opacity-100 translate-y-0 sm:scale-100" 
            leave="ease-in duration-300" 
            leave-from="opacity-100 translate-y-0 sm:scale-100" 
            leave-to="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="relative transform overflow-hidden rounded-[3rem] bg-white text-left shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] transition-all sm:my-8 sm:w-full sm:max-w-md">
              <!-- Decorative background -->
              <div class="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <SparklesIcon class="w-64 h-64 text-primary-600" />
              </div>

              <div class="p-8 sm:p-12 relative">
                <!-- Close Button -->
                <button 
                  @click="handleClose" 
                  class="absolute top-8 right-8 w-10 h-10 rounded-full hover:bg-secondary-50 flex items-center justify-center transition-colors"
                >
                  <XMarkIcon class="w-6 h-6 text-secondary-300" />
                </button>

                <!-- Header -->
                <div class="flex flex-col items-center text-center mb-10">
                  <div class="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-primary-200 mb-6 group transition-transform hover:scale-105">
                    <SparklesIcon class="w-10 h-10" />
                  </div>
                  <DialogTitle as="h3" class="text-3xl font-black text-secondary-900 tracking-tight">
                    {{ sent ? '信件已寄出' : '開始您的旅程' }}
                  </DialogTitle>
                  <p class="text-sm font-bold text-secondary-400 mt-2 max-w-[240px]">
                    {{ sent ? '請檢查您的電子郵件信箱以完成登入' : '登入 TravelMate 探索更多精彩行程' }}
                  </p>
                </div>

                <!-- Success State -->
                <div v-if="sent" class="flex flex-col items-center">
                  <div class="w-full p-6 bg-emerald-50 rounded-3xl border border-emerald-100/50 flex items-center gap-4 mb-8">
                    <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                      <CheckCircleIcon class="w-6 h-6" />
                    </div>
                    <div class="flex-1">
                      <p class="text-xs font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Check Your Email</p>
                      <p class="text-[10px] font-bold text-emerald-500/80">{{ email }}</p>
                    </div>
                  </div>
                  <button 
                    @click="sent = false"
                    class="text-xs font-black text-primary-500 hover:text-primary-600 uppercase tracking-[0.2em] transition-colors"
                  >
                    沒收到信？重新輸入
                  </button>
                </div>

                <!-- Auth Form -->
                <template v-else>
                  <div class="space-y-6">
                    <!-- Email Input -->
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-secondary-400 uppercase tracking-[0.3em] ml-1">Email Address</label>
                      <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                          <EnvelopeIcon class="w-5 h-5 text-secondary-300 group-focus-within:text-primary-500 transition-colors" />
                        </div>
                        <input 
                          type="email" 
                          v-model="email"
                          placeholder="you@example.com"
                          class="block w-full pl-14 pr-5 py-5 bg-secondary-50/50 border-2 border-transparent focus:border-primary-500/20 focus:bg-white rounded-[1.5rem] text-sm font-bold placeholder-secondary-300 outline-none transition-all"
                          @keyup.enter="handleMagicLink"
                        />
                      </div>
                    </div>

                    <!-- Submit Button -->
                    <button 
                      @click="handleMagicLink"
                      :disabled="loading || !isValidEmail"
                      class="relative w-full group overflow-hidden bg-secondary-900 border-none px-6 py-5 rounded-2xl shadow-2xl shadow-secondary-100 hover:shadow-primary-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                    >
                      <div class="absolute inset-x-0 bottom-0 h-1 bg-primary-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                      <div class="relative z-10 flex items-center justify-center gap-2">
                        <span class="text-sm font-black text-white uppercase tracking-[0.2em]">
                          {{ loading ? '處理中...' : '發送登入連結' }}
                        </span>
                        <ArrowRightIcon v-if="!loading" class="w-4 h-4 text-primary-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    <!-- Divider -->
                    <div class="relative py-4">
                      <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-secondary-100"></div></div>
                      <div class="relative flex justify-center"><span class="bg-white px-4 text-[10px] font-black text-secondary-300 uppercase tracking-[0.2em]">或使用快速登入</span></div>
                    </div>

                    <!-- Social Logins -->
                    <div class="grid grid-cols-1 gap-4">
                      <button 
                        @click="handleSocialLogin('google')"
                        class="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white border border-secondary-100 hover:border-primary-500 hover:shadow-xl hover:shadow-primary-50 transition-all active:scale-95 group"
                      >
                        <svg class="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span class="text-xs font-black text-secondary-600 uppercase tracking-widest">Google</span>
                      </button>
                    </div>
                  </div>
                </template>

                <!-- Footer -->
                <div class="mt-12 text-center">
                  <p class="text-[10px] font-black text-secondary-300 uppercase tracking-[0.2em] mb-4">
                    點擊登入即表示您同意我們的
                  </p>
                  <div class="flex items-center justify-center gap-4">
                    <a href="#" class="text-[10px] font-black text-secondary-500 hover:text-primary-500 uppercase tracking-widest transition-colors">服務條款</a>
                    <div class="w-1 h-1 rounded-full bg-secondary-100"></div>
                    <a href="#" class="text-[10px] font-black text-secondary-500 hover:text-primary-500 uppercase tracking-widest transition-colors">隱私權政策</a>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
