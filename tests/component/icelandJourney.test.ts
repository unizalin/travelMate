vi.mock('@/services/tripWeatherService', () => ({ loadDayForecast: async () => ({ kind: 'unavailable', fetchedAt: new Date().toISOString() }) }))
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import IcelandJourney from '@/views/IcelandJourney.vue'

function mountJourney() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/iceland', component: IcelandJourney }] })
  return mount(IcelandJourney, { global: { plugins: [router] } })
}

const state = vi.hoisted(() => ({ store: null as null | { user: { id: string } | null; initializeAuth: ReturnType<typeof vi.fn>; openAuthModal: ReturnType<typeof vi.fn> } }))
vi.mock('@/stores/auth', async () => {
  const { reactive } = await import('vue')
  state.store = reactive({ user: null, initializeAuth: vi.fn(), openAuthModal: vi.fn() })
  return { useAuthStore: () => state.store }
})
vi.mock('@/views/IcelandPlanner.vue', () => ({ default: { template: '<div data-test="companion">同行旅伴的行程</div>' } }))

beforeEach(async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test-key')
  await import('@/stores/auth')
  if (state.store) { state.store.user = null; state.store.openAuthModal.mockReset(); state.store.initializeAuth.mockReset() }
})
afterEach(() => vi.unstubAllEnvs())

describe('Unified Iceland itinerary', () => {
  it('shows visitors the itinerary and a sign-in action without private controls', async () => {
    const wrapper = mountJourney()
    await flushPromises()
    expect(wrapper.text()).toContain('一起去倫敦・冰島')
    expect(wrapper.text()).toContain('Hammersmith')
    expect(wrapper.text()).not.toMatch(/jinyo|Kevin Ho|Rosanne|YU/)
    expect(wrapper.find('[data-test="companion"]').exists()).toBe(false)
    expect(wrapper.find('textarea[aria-label="共用 Memo"]').exists()).toBe(false)
    await wrapper.findAll('button').find(button => button.text() === '登入')?.trigger('click')
    expect(state.store?.openAuthModal).toHaveBeenCalledWith('login', '/iceland?section=flights')
    wrapper.unmount()
  })

  it('places the login connection notice on its own line below the action row', async () => {
    state.store!.initializeAuth.mockRejectedValueOnce(new Error('offline'))
    const wrapper = mountJourney()
    await flushPromises()
    const notice = wrapper.find('.header-notice [role="status"]')
    expect(notice.text()).toContain('登入服務暫時無法連線')
    expect(notice.element.parentElement?.classList.contains('brand-row')).toBe(false)
    expect(wrapper.find('.brand-row [role="status"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('reveals companion tools after sign-in and removes them on sign-out in the same entry', async () => {
    const wrapper = mountJourney()
    await flushPromises()
    if (state.store) state.store.user = { id: 'companion' }
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find('[data-test="companion"]').exists()).toBe(true))
    if (state.store) state.store.user = null
    await flushPromises()
    expect(wrapper.find('[data-test="companion"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('登入')
    expect(wrapper.find('[aria-label="倫敦前段行程"]').exists()).toBe(true)
    expect(wrapper.find('.prelude-people').exists()).toBe(false)
    wrapper.unmount()
  })
})
