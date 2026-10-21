import { supabase } from '@/services/supabase'
import { requireGoogleLogin } from '@/services/googleLoginAvailability'
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
  
  // Store the unsubscribe function to prevent memory leaks
  let authStateUnsubscribe: (() => void) | null = null
  let initialization: Promise<void> | null = null

  const isAuthenticated = computed(() => !!user.value)

  function initializeAuth(): Promise<void> {
    if (initialization) return initialization
    initialization = doInitializeAuth().finally(() => { initialization = null })
    return initialization
  }

  async function doInitializeAuth() {
    loading.value = true
    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null

    // Clean up previous subscription if exists
    if (authStateUnsubscribe) {
      authStateUnsubscribe()
    }

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      session.value = _session
      user.value = _session?.user ?? null

      if (_event === 'SIGNED_IN' && _session?.user) {
        // Supabase calls inside the auth callback can block the auth lock.
        setTimeout(() => { void syncProfileFromMetadata(_session.user) }, 0)
      }

      // Redirect to login if session expires
      if (_event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })
    
    // Store unsubscribe function
    authStateUnsubscribe = () => subscription.unsubscribe()
    
    } finally {
      loading.value = false
    }
  }

  async function signInWithEmail(email: string) {
    const redirectTo = new URL(`${window.location.origin}/auth/callback`)
    if (redirectAfterLogin.value) {
      redirectTo.searchParams.set('next', redirectAfterLogin.value)
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo.toString(),
      },
    })
    if (error) throw error
  }

  async function signInWithOAuth(provider: 'google' | 'line' | 'facebook') {
    const redirectTo = new URL(`${window.location.origin}/auth/callback`)
    if (redirectAfterLogin.value) {
      redirectTo.searchParams.set('next', redirectAfterLogin.value)
    }

    if (provider !== 'google') throw new Error('目前使用 Google 登入。')
    await requireGoogleLogin(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo.toString(),
        queryParams: {
          prompt: 'select_account',
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
        .maybeSingle()

      const profileData = profile as { display_name: string | null } | null

      // If profile exists but name is email or empty, try metadata
      const currentName = profileData?.display_name
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
