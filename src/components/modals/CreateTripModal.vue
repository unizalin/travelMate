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

const name = ref('')
const destination = ref('')
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!user.value) return
  if (new Date(endDate.value) < new Date(startDate.value)) {
    error.value = '結束日期不能早於開始日期'
    return
  }

  try {
    loading.value = true
    error.value = ''

    const newTrip = await tripStore.createTrip({
      name: name.value,
      destination: destination.value,
      start_date: startDate.value,
      end_date: endDate.value,
      created_by: user.value.id
    })

    // Reset form
    name.value = ''
    destination.value = ''
    startDate.value = ''
    endDate.value = ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit('success', (newTrip as any).id)
    emit('close')
  } catch (e: any) {
    error.value = e.message
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
        <div class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-secondary-950 p-6 md:p-8 text-left align-middle shadow-2xl border border-gray-100 dark:border-white/5 transition-all">
              <DialogTitle as="h3" class="text-2xl font-black leading-6 text-gray-900 dark:text-white mb-6 tracking-tight transition-colors">
                建立新旅程
              </DialogTitle>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <div v-if="error" class="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-black border border-red-100 dark:border-red-500/20 transition-colors uppercase tracking-widest">{{ error }}</div>

                <div>
                  <label class="block text-[10px] font-black text-gray-400 dark:text-white/20 mb-1.5 uppercase tracking-widest px-1 transition-colors">旅程名稱</label>
                  <input v-model="name" type="text" required placeholder="例如：東京賞櫻"
                    class="block w-full rounded-2xl bg-gray-50 dark:bg-white/5 border-none shadow-none focus:ring-4 focus:ring-primary-500/10 py-4 px-6 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10 transition-all outline-none" />
                </div>

                <div>
                  <label class="block text-[10px] font-black text-gray-400 dark:text-white/20 mb-1.5 uppercase tracking-widest px-1 transition-colors">目的地</label>
                  <input v-model="destination" type="text" required placeholder="例如：東京, 日本"
                    class="block w-full rounded-2xl bg-gray-50 dark:bg-white/5 border-none shadow-none focus:ring-4 focus:ring-primary-500/10 py-4 px-6 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10 transition-all outline-none" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-[10px] font-black text-gray-400 dark:text-white/20 mb-1.5 uppercase tracking-widest px-1 transition-colors">開始日期</label>
                    <input v-model="startDate" type="date" required
                      class="block w-full rounded-2xl bg-gray-50 dark:bg-white/5 border-none shadow-none focus:ring-4 focus:ring-primary-500/10 py-4 px-6 text-sm font-bold text-gray-900 dark:text-white transition-all outline-none" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-black text-gray-400 dark:text-white/20 mb-1.5 uppercase tracking-widest px-1 transition-colors">結束日期</label>
                    <input v-model="endDate" type="date" required
                      class="block w-full rounded-2xl bg-gray-50 dark:bg-white/5 border-none shadow-none focus:ring-4 focus:ring-primary-500/10 py-4 px-6 text-sm font-bold text-gray-900 dark:text-white transition-all outline-none" />
                  </div>
                </div>

                <div class="mt-8 flex justify-end gap-3 transition-colors">
                  <button type="button"
                    class="rounded-2xl px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/20 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none transition-all uppercase tracking-widest"
                    @click="emit('close')">
                    取消
                  </button>
                  <button type="submit" :disabled="loading"
                    class="rounded-2xl bg-primary-600 px-8 py-4 text-[10px] font-black text-white shadow-xl shadow-primary-500/20 hover:bg-primary-500 focus:outline-none disabled:opacity-50 transition-all transform active:scale-95 uppercase tracking-widest">
                    {{ loading ? '建立中...' : '建立旅程' }}
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
