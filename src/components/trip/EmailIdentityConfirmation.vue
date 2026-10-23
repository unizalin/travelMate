<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { matchEmailReservation, confirmEmailReservation, type ReservedIdentity } from '@/services/journeyInviteService'
const props = defineProps<{ tripId: string; accountId: string }>()
const emit = defineEmits<{ joined: [tripId: string]; offered: [value: boolean] }>()
const identity = ref<ReservedIdentity | null>(null)
const busy = ref(false)
const error = ref('')
let epoch = 0
watch(() => [props.tripId, props.accountId], async () => {
  const current = ++epoch
  identity.value = null; error.value = ''; busy.value = false; emit('offered', false)
  if (!props.accountId) return
  try {
    const match = await matchEmailReservation(props.tripId)
    if (current !== epoch) return
    identity.value = match; emit('offered', match !== null)
  } catch (cause) {
    if (current === epoch) error.value = cause instanceof Error ? cause.message : '無法確認預綁身分，請稍後重試。'
  }
}, { immediate: true })
onBeforeUnmount(() => { epoch++ })
function decline() { if (!busy.value) { identity.value = null; error.value = ''; emit('offered', false) } }
async function confirm() {
  if (!identity.value || busy.value) return
  const current = epoch
  busy.value = true; error.value = ''
  try {
    const result = await confirmEmailReservation(props.tripId, identity.value.id)
    if (current === epoch) emit('joined', result.tripId)
  } catch (cause) {
    if (current === epoch) error.value = cause instanceof Error ? cause.message : '綁定失敗，請稍後重試。'
  } finally { if (current === epoch) busy.value = false }
}
</script>
<template>
  <section v-if="identity" aria-label="確認預綁身分" class="my-4 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
    <p>你的信箱已被預留為 {{ identity.name }}，確認這是你的身分嗎？</p>
    <div class="mt-3 flex flex-wrap gap-3"><button type="button" data-test="confirm-email-identity" :disabled="busy" class="min-h-11 rounded-lg border px-4" @click="confirm">確認綁定</button><button type="button" data-test="decline-email-identity" :disabled="busy" class="min-h-11 underline" @click="decline">這不是我</button></div>
    <p v-if="busy" role="status" class="mt-2">正在確認身分…</p>
  </section>
  <p v-if="error" role="alert" class="my-3 text-sm text-red-700">{{ error }}</p>
</template>
