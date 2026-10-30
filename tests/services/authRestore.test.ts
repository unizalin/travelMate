import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
const api = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn() }))
vi.mock('@/services/supabase', () => ({ supabase: { auth: api } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
beforeEach(() => {
  setActivePinia(createPinia())
  api.getSession.mockReset()
  api.onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
})
it('restores an existing session and shares concurrent startup work', async () => {
  const session = { user: { id: 'returning-member' } }
  api.getSession.mockResolvedValue({ data: { session }, error: null })
  const store = useAuthStore()
  await Promise.all([store.initializeAuth(), store.initializeAuth()])
  expect(store.user?.id).toBe('returning-member')
  expect(store.isAuthenticated).toBe(true)
  expect(store.loading).toBe(false)
  expect(api.getSession).toHaveBeenCalledTimes(1)
  expect(api.onAuthStateChange).toHaveBeenCalledTimes(1)
})
it('surfaces recovery errors and allows a later retry', async () => {
  api.getSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('network unavailable') })
  const store = useAuthStore()
  await expect(store.initializeAuth()).rejects.toThrow('network unavailable')
  expect(store.loading).toBe(false)
  api.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'returning-member' } } }, error: null })
  await store.initializeAuth()
  expect(store.user?.id).toBe('returning-member')
})
