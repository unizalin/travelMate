import { supabase } from '@/services/supabase'
import type { Session, User } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(true)
  const showAuthModal = ref(false)
  const authMode = ref<'login' | 'register'>('login')
  const redirectAfterLogin = ref<string | null>(null)
  const router = useRouter()

  const isAuthenticated = computed(() => !!user.value)

  async function initializeAuth() {
    loading.value = true
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user ?? null

    supabase.auth.onAuthStateChange(async (_event, _session) => {
      session.value = _session
      user.value = _session?.user ?? null

      if (_event === 'SIGNED_IN' && _session?.user) {
        // Sync profile from metadata if needed
        await syncProfileFromMetadata(_session.user)
      }

      // Redirect to login if session expires
      if (_event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })
    loading.value = false
  }

  async function signInWithEmail(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  async function signInWithOAuth(provider: 'google' | 'line' | 'facebook') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
  }

  // LINE Logic Removed

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    session.value = null
    router.push('/')
  }

  function openAuthModal(mode: 'login' | 'register' = 'login', redirect: string | null = null) {
    authMode.value = mode
    redirectAfterLogin.value = redirect
    showAuthModal.value = true
  }

  function closeAuthModal() {
    showAuthModal.value = false
    redirectAfterLogin.value = null
  }

  async function syncProfileFromMetadata(user: User) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single() as { data: { display_name: string | null } | null }

      // If profile exists but name is email or empty, try metadata
      const currentName = profile?.display_name
      const metadataName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name

      if (metadataName && (!currentName || currentName === user.email)) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            display_name: metadataName,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture
          } as any)
      }
    } catch (e) {
      console.error('Error syncing profile:', e)
    }
  }

  return {
    user,
    session,
    loading,
    showAuthModal,
    authMode,
    redirectAfterLogin,
    isAuthenticated,
    initializeAuth,
    signInWithEmail,
    signInWithOAuth,
    signOut,
    openAuthModal,
    closeAuthModal,
  }
})
