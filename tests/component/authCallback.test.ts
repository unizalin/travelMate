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
})
