import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ user: null as { id: string } | null, session: null, initializeAuth: vi.fn(), openAuthModal: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test-key')
  auth.user = { id: 'member' }
  auth.openAuthModal.mockReset()
  auth.initializeAuth.mockReset()
})

describe('Iceland entry navigation', () => {
  it.each(['/', '/trips'])('takes a signed-in companion from %s directly to flight selection', async path => {
    const { default: router, ICELAND_TRIP_ID } = await import('@/router')
    await router.push(path)
    expect(router.currentRoute.value.path).toBe('/iceland')
    expect(router.currentRoute.value.query.section).toBe('flights')
  })

  it('lets a visitor read the same entry without a forced login dialog', async () => {
    auth.user = null
    const { default: router } = await import('@/router')
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/iceland')
    expect(auth.openAuthModal).not.toHaveBeenCalled()
  })

  it('redirects the previous companion URL to the same itinerary entry', async () => {
    const { default: router, ICELAND_TRIP_ID } = await import('@/router')
    await router.push(`/trips/${ICELAND_TRIP_ID}/journey?section=flights`)
    expect(router.currentRoute.value.path).toBe('/iceland')
    expect(router.currentRoute.value.query.section).toBe('flights')
  })

  it('keeps an explicit sharing link readable without signing in', async () => {
    auth.user = null
    const { default: router } = await import('@/router')
    await router.push('/share/iceland')
    expect(router.currentRoute.value.path).toBe('/iceland')
    expect(auth.openAuthModal).not.toHaveBeenCalled()
  })
})
