<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { previewInvite, joinInvite, type InviteMember } from '@/services/journeyInviteService'
import { canReadJourney } from '@/services/journeyService'
import { ICELAND_TRIP_ID } from '@/router/iceland'
import { clearInvite, rememberInvite } from '@/services/inviteReturn'
const route = useRoute(); const router = useRouter(); const auth = useAuthStore()
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
const members = ref<InviteMember[]>([]); const selected = ref<InviteMember | null>(null)
const busy = ref(false); const error = ref(''); const ready = ref(false)
async function load() {
  busy.value = true; error.value = ''; members.value = []; selected.value = null
  try {
    if (!/^[a-f0-9]{64}$/.test(token.value)) throw new Error('邀請連結已失效，請向建立者索取新連結。')
    if (auth.user) {
      const preview = await previewInvite(token.value)
      if (await canReadJourney(ICELAND_TRIP_ID)) { clearInvite(); await router.replace('/iceland?section=flights'); return }
      members.value = preview.members
    }
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '無法讀取邀請。' }
  finally { busy.value = false; ready.value = true }
}
async function login() {
  busy.value = true; error.value = ''
  try {
    const path = '/iceland/join?token=' + token.value
    rememberInvite(path)
    await auth.signInWithOAuth('google', path)
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '登入失敗，請重試。'; busy.value = false }
}
async function confirm() {
  if (!selected.value || busy.value) return
  busy.value = true; error.value = ''
  try { await joinInvite(token.value, selected.value.id); clearInvite(); await router.replace('/iceland?section=flights') }
  catch (cause) { await load(); error.value = cause instanceof Error ? cause.message : '認領失敗，請重試。' }
  finally { busy.value = false }
}
onMounted(async () => { try { if (!auth.user) await auth.initializeAuth(); await load() } catch { error.value = '登入服務暫時無法連線。'; ready.value = true } })
</script>
<template>
  <main class="mx-auto max-w-xl px-6 py-12 text-stone-700">
    <h1 class="text-xl font-semibold">加入倫敦＋冰島旅程</h1>
    <p class="my-4 text-sm">建議使用 Safari 或 Chrome 開啟此連結（LINE 內建瀏覽器可能無法完成 Google 登入）</p>
    <p v-if="error" role="alert" class="my-4 text-red-700">{{ error }}</p>
    <p v-if="busy" role="status">處理中…</p>
    <button v-if="ready && !auth.user && !error" data-test="invite-login" :disabled="busy" class="my-4 min-h-11 rounded-xl border px-4" @click="login">使用 Google 登入</button>
    <template v-if="auth.user && members.length">
      <p class="my-4">請選擇自己的名字，每個帳號只能認領一位。</p>
      <div class="grid grid-cols-2 gap-3"><button v-for="member in members" :key="member.id" :data-member="member.id" :disabled="member.claimed || busy" class="min-h-12 rounded-xl border p-3 disabled:opacity-50" @click="selected=member">{{ member.name }}{{ member.claimed ? ' · 已認領' : '' }}</button></div>
      <section v-if="selected" class="my-6 rounded-xl border p-4" aria-label="確認身分">
        <p>你選擇的是 {{ selected.name }}，確定嗎？</p>
        <button data-test="confirm-identity" :disabled="busy" class="mr-4 mt-4 min-h-11 rounded-xl border px-4" @click="confirm">確定認領</button>
        <button :disabled="busy" @click="selected=null">重新選擇</button>
      </section>
    </template>
    <RouterLink to="/iceland" class="mt-6 inline-block underline" @click="clearInvite">回到公開行程</RouterLink>
  </main>
</template>
