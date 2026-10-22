import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AuthCallback from '@/views/AuthCallback.vue'

const auth = vi.hoisted(() => ({ redirectAfterLogin: null, closeAuthModal: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('@/services/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'member' } } }, error: null }) } } }))

afterEach(() => vi.useRealTimers())

describe('Sign-in return destination', () => {
  it.each(['', '?next=%2Ficeland%2Fplan'])('opens flight selection after signing in %s', async query => {
    vi.useFakeTimers()
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/auth/callback', component: AuthCallback },
      { path: '/iceland', name: 'iceland-planner', component: { template: '<div />' } },
      { path: '/iceland/plan', redirect: '/iceland' },
      { path: '/trips', component: { template: '<div />' } },
    ] })
    await router.push(`/auth/callback${query}`)
    const wrapper = mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('iceland-planner')
    expect(router.currentRoute.value.query.section).toBe('flights')
    wrapper.unmount()
  })
  it('preserves the invitation token through the OAuth callback', async () => {
    vi.useFakeTimers()
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/auth/callback', component: AuthCallback },
      { path: '/iceland/join', component: { template: '<div />' } },
      { path: '/iceland', component: { template: '<div />' } },
    ] })
    const destination = '/iceland/join?token=' + 'b'.repeat(64)
    await router.push('/auth/callback?next=' + encodeURIComponent(destination))
    const wrapper = mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises(); await vi.advanceTimersByTimeAsync(500); await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe(destination); wrapper.unmount()
  })

})

describe('Invitation return fallback', () => {
  it('recovers the invitation after OAuth when next is absent', async () => {
    vi.useFakeTimers()
    const destination='/iceland/join?token='+'d'.repeat(64)
    sessionStorage.setItem('tripbook-invite-return',destination)
    const router=createRouter({history:createMemoryHistory(),routes:[
      {path:'/auth/callback',component:AuthCallback},{path:'/iceland/join',component:{template:'<div />'}},
    ]})
    await router.push('/auth/callback')
    const wrapper=mount(AuthCallback,{global:{plugins:[router]}})
    await flushPromises();await vi.advanceTimersByTimeAsync(500);await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe(destination)
    sessionStorage.removeItem('tripbook-invite-return');wrapper.unmount()
  })
})
