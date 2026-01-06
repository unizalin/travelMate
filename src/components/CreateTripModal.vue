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
    error.value = 'End date cannot be before start date'
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
    <Dialog as="div" @close="emit('close')" class="relative z-10">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                Create New Trip
              </DialogTitle>

              <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
                <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">Trip Name</label>
                  <input v-model="name" type="text" required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">Destination</label>
                  <input v-model="destination" type="text" required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Start Date</label>
                    <input v-model="startDate" type="date" required
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">End Date</label>
                    <input v-model="endDate" type="date" required
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
                  </div>
                </div>

                <div class="mt-4 flex justify-end space-x-2">
                  <button type="button"
                    class="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    @click="emit('close')">
                    Cancel
                  </button>
                  <button type="submit" :disabled="loading"
                    class="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50">
                    {{ loading ? 'Creating...' : 'Create' }}
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
