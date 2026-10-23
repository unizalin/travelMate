<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LineReminderSettings from '@/components/trip/LineReminderSettings.vue'
const route = useRoute()
const auth = useAuthStore()
const error = ref('')
const ticket = computed(() => typeof route.query.ticket === 'string' && /^[a-f0-9]{64}$/.test(route.query.ticket) ? route.query.ticket : undefined)
async function login() {
  error.value = ''
  try {
    auth.redirectAfterLogin = ticket.value ? `/line/connect?ticket=${ticket.value}` : '/line/connect'
    await auth.signInWithOAuth('google')
  } catch (failure) { error.value = failure instanceof Error ? failure.message : '登入未完成，請重試。' }
}
onMounted(async () => { await auth.initializeAuth() })
</script>
<template>
  <main class="line-connect">
    <a href="/iceland" class="back">← 回到 TravelMate</a>
    <p v-if="auth.loading" role="status">正在確認登入狀態…</p>
    <LineReminderSettings v-else-if="auth.user" :account-id="auth.user.id" :ticket="ticket" />
    <section v-else>
      <h1>綁定 LINE 旅行提醒</h1>
      <p>請使用已加入旅程的 Google 帳號登入。加好友與登入都不會自動開啟提醒。</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <button @click="login">使用 Google 登入</button>
    </section>
  </main>
</template>
<style scoped>
.line-connect{max-width:640px;margin:0 auto;padding:24px 16px;min-height:70vh}.back{display:inline-flex;align-items:center;min-height:44px;color:#397d86;margin-bottom:16px}.line-connect section{padding:20px;border:1px solid #dde3de;border-radius:14px;background:white;line-height:1.8}.line-connect h1{font-size:24px;font-weight:600}.line-connect button{min-height:44px;margin-top:14px;padding:10px 18px;background:#246757;border-radius:9px;color:white}
</style>
