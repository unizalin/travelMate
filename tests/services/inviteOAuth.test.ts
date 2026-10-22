import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
const oauth = vi.hoisted(() => vi.fn())
vi.mock('@/services/supabase', () => ({ supabase: { auth: { signInWithOAuth: oauth } } }))
vi.mock('@/services/googleLoginAvailability', () => ({ requireGoogleLogin: async () => {} }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
beforeEach(() => { setActivePinia(createPinia()); oauth.mockReset().mockResolvedValue({error:null}) })
it('sends the entire invitation destination through Google and the Supabase callback without opening a second login dialog', async () => {
 const auth=useAuthStore()
 const destination='/iceland/join?token='+'e'.repeat(64)
 await auth.signInWithOAuth('google',destination)
 const request=oauth.mock.calls[0][0]
 const callback=new URL(request.options.redirectTo)
 expect(callback.pathname).toBe('/auth/callback')
 expect(callback.searchParams.get('next')).toBe(destination)
 expect(request.options.queryParams.prompt).toBe('select_account')
 expect(auth.showAuthModal).toBe(false)
})
it('preserves the OAuth destination when browser session storage is unavailable', async () => {
 const {rememberInvite,pendingInvite}=await import('@/services/inviteReturn')
 const destination='/iceland/join?token='+'f'.repeat(64)
 vi.stubGlobal('sessionStorage',{setItem(){throw new Error('storage blocked')},getItem(){throw new Error('storage blocked')}})
 try {
  expect(()=>rememberInvite(destination)).not.toThrow()
  expect(pendingInvite()).toBeNull()
  await useAuthStore().signInWithOAuth('google',destination)
  expect(new URL(oauth.mock.calls[0][0].options.redirectTo).searchParams.get('next')).toBe(destination)
 } finally {vi.unstubAllGlobals()}
})
