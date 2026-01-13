<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useTripStore } from '@/stores/trip'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success', id: string): void
}>()

const authStore = useAuthStore()
const tripStore = useTripStore()
const { user } = storeToRefs(authStore)

const inviteCode = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!user.value || !inviteCode.value) return

  try {
    loading.value = true
    error.value = ''

    const tripId = await tripStore.joinTrip(inviteCode.value, user.value.id)

    // Reset form
    inviteCode.value = ''

    emit('success', tripId)
    emit('close')
  } catch (e: any) {
    if (e.message?.includes('already a member')) {
        error.value = '您已經是這個旅程的成員了'
    } else {
        error.value = '無法加入旅程，請檢查邀請碼是否正確'
    }
  } finally {
    loading.value = false
  }
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
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 md:p-8 text-left align-middle shadow-2xl transition-all">
              <DialogTitle as="h3" class="text-2xl font-black leading-6 text-gray-900 mb-2">
                加入旅程
              </DialogTitle>
              <p class="text-sm text-gray-500 mb-6 font-medium">請輸入朋友分享給您的 6 位數邀請碼</p>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <div v-if="error" class="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">{{ error }}</div>

                <div>
                  <label class="block text-sm font-bold text-gray-700 mb-1">邀請碼</label>
                  <input v-model="inviteCode" type="text" required placeholder="例如：ABC123" maxlength="6"
                    class="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-3 px-4 border transition-all font-mono text-lg uppercase tracking-widest text-center" />
                </div>

                <div class="mt-8 flex justify-end space-x-3">
                  <button type="button"
                    class="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition-all"
                    @click="emit('close')">
                    取消
                  </button>
                  <button type="submit" :disabled="loading || !inviteCode"
                    class="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-200 hover:bg-primary-500 hover:shadow-primary-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 transition-all transform active:scale-95">
                    {{ loading ? '加入中...' : '加入旅程' }}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
