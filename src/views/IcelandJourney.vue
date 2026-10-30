<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { canReadJourney } from '@/services/journeyService'
import { loadLocalJourney } from '@/domain/tripJourney'
import EmailIdentityConfirmation from '@/components/trip/EmailIdentityConfirmation.vue'
import JourneyAdmin from '@/components/trip/JourneyAdmin.vue'
import TripReader from '@/components/trip/TripReader.vue'
import { ICELAND_TRIP_ID } from '@/router/iceland'
import type { useAuthStore } from '@/stores/auth'
const CompanionJourney = defineAsyncComponent(async () => (await import('./IcelandPlanner.vue')).default)
const route = useRoute(); const router = useRouter()
const auth = shallowRef<ReturnType<typeof useAuthStore> | null>(null)
const signedIn = computed(() => Boolean(auth.value?.user))
const member = shallowRef(false)
const membershipReady = shallowRef(false)
const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const authReady = shallowRef(false)
const loginError = shallowRef('')
const membershipError = shallowRef('')
const reservationOffered = shallowRef(false)
let epoch = 0
let refreshTimer: ReturnType<typeof setInterval> | undefined
async function refreshMembership() {
  if (!authReady.value) return
  const current = ++epoch
  membershipReady.value = false
  membershipError.value = ''
  if (!auth.value?.user) { member.value = false; membershipReady.value = true; return }
  if (!navigator.onLine) {
    try { member.value = loadLocalJourney(auth.value.user.id, ICELAND_TRIP_ID) !== null } catch { member.value = false }
    membershipReady.value = true
    return
  }
  try {
    const canRead = await canReadJourney(ICELAND_TRIP_ID)
    if (current === epoch) member.value = canRead
  } catch (cause) {
    if (current === epoch) {
      console.warn('Journey membership check failed', {
        message: cause instanceof Error ? cause.message : 'unknown_error',
        code: cause instanceof Error && 'code' in cause ? cause.code : 'UNKNOWN',
      })
    }
    if (current === epoch) {
      member.value = false
      membershipError.value = '無法確認旅程資格，請重試；目前仍可查看公開行程。'
    }
  }
  if (current === epoch) membershipReady.value = true
  if (current === epoch && !member.value && !membershipError.value && route.query.section && route.query.section !== 'itinerary') {
    await router.replace({ path: '/iceland', query: { ...route.query, section: 'itinerary' } })
  }
}
watch(() => auth.value?.user?.id, () => { member.value = false; void refreshMembership() })
watch(() => [route.query.section, membershipReady.value, member.value, membershipError.value], async () => {
  const section=route.query.section
  if (membershipReady.value && !member.value && !membershipError.value && section && section !== 'itinerary') await router.replace({ query: { ...route.query, section: 'itinerary' } })
}, { immediate: true })
onMounted(async () => {
  if (!configured) return
  await restoreAuth()
  refreshTimer = setInterval(() => { if (document.visibilityState === 'visible') void refreshMembership() }, 30_000)
  window.addEventListener('focus', refreshMembership)
  window.addEventListener('online', refreshMembership)
  window.addEventListener('offline', refreshMembership)
})
async function restoreAuth() {
  authReady.value = false
  loginError.value = ''
  try {
    const { useAuthStore } = await import('@/stores/auth')
    auth.value = useAuthStore()
    await auth.value.initializeAuth()
    authReady.value = true
    await refreshMembership()
  } catch { loginError.value = '登入服務暫時無法連線，仍可查看行程。' }
}
onBeforeUnmount(() => { epoch++; clearInterval(refreshTimer); window.removeEventListener('focus', refreshMembership); window.removeEventListener('online', refreshMembership); window.removeEventListener('offline', refreshMembership) })
async function signOut() {
  try { await auth.value?.signOut(); member.value = false }
  catch { loginError.value = '登出失敗，請稍後再試。' }
}
function signIn() { auth.value?.openAuthModal('login', '/iceland') }
async function switchAccount() {
  try { await signOut(); auth.value?.openAuthModal('login', '/iceland'); await auth.value?.signInWithOAuth('google') }
  catch { loginError.value = '切換帳號失敗，請重試。' }
}
</script>
<template>
  <CompanionJourney v-if="member" :key="auth?.user?.id">
    <template #account-actions><button class="min-h-11 rounded-full border px-4 text-sm" @click="router.replace({query:{section:'me'}})">我的旅程</button></template>
    <template #management="{ tripId }"><JourneyAdmin :trip-id="tripId" /></template>
    <template #account-settings>
      <div class="account-row"><p>登入帳號<strong>{{ auth?.user?.email }}</strong></p><button class="mr-5 min-h-11 underline" @click="switchAccount">切換帳號</button><button class="min-h-11 underline" @click="signOut">登出本機</button></div>
    </template>
  </CompanionJourney>
  <TripReader v-else>
    <template #header-actions>
      <details v-if="signedIn" class="account-menu"><summary>帳號</summary><div><p class="break-all">目前帳號：{{ auth?.user?.email }}</p><button class="min-h-11" @click="switchAccount">切換帳號</button><button class="min-h-11" @click="signOut">登出本機</button></div></details>
      <button v-else-if="configured && authReady" type="button" class="min-h-11 rounded-full border px-4 text-sm font-semibold disabled:opacity-50" :disabled="!auth" @click="signIn">登入</button>
    </template>
    <template #header-notice>
      <p v-if="configured && !authReady && !loginError" role="status">正在恢復登入狀態…</p>
      <p v-else-if="signedIn && !membershipReady" role="status">正在確認旅程資格…</p>
      <p v-else-if="signedIn && membershipError" role="alert">{{ membershipError }} <button type="button" data-test="retry-membership" class="min-h-11 underline" @click="refreshMembership">重新確認</button></p>
      <p v-else-if="signedIn && !reservationOffered" role="status">尚未加入，請透過邀請連結加入</p>
      <EmailIdentityConfirmation v-if="auth?.user && !member" :trip-id="ICELAND_TRIP_ID" :account-id="auth.user.id" @offered="reservationOffered=$event" @joined="refreshMembership" />
      <p v-if="loginError" role="status">{{ loginError }} <button v-if="!authReady" type="button" data-test="retry-auth" class="min-h-11 underline" @click="restoreAuth">重試恢復登入</button></p>
    </template>
  </TripReader>
</template>
<style scoped>.account-menu{position:relative;font-size:13px}.account-menu summary{cursor:pointer;min-height:44px;display:flex;align-items:center}.account-menu>div{position:absolute;right:0;z-index:30;width:280px;padding:16px;border:1px solid #ccd5cf;border-radius:12px;background:#f7f8f6}.account-menu button{display:block}</style>
