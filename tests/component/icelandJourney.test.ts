vi.mock('@/services/tripWeatherService', () => ({ loadDayForecast: async () => ({ kind: 'unavailable', fetchedAt: new Date().toISOString() }) }))
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import IcelandJourney from '@/views/IcelandJourney.vue'

function mountJourney() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/iceland', component: IcelandJourney }] })
  return mount(IcelandJourney, { global: { plugins: [router] } })
}

const membership = vi.hoisted(() => vi.fn())
vi.mock('@/services/journeyService', () => ({ canReadJourney: membership, loadJourney: vi.fn().mockRejectedValue(new Error('document unavailable')) }))
const state = vi.hoisted(() => ({ store: null as null | { user: { id: string } | null; initializeAuth: ReturnType<typeof vi.fn>; openAuthModal: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> } }))
vi.mock('@/stores/auth', async () => {
  const { reactive } = await import('vue')
  state.store = reactive({ user: null, initializeAuth: vi.fn(), openAuthModal: vi.fn(), signOut: vi.fn() })
  return { useAuthStore: () => state.store }
})
vi.mock('@/views/IcelandPlanner.vue', () => ({ default: { template: '<div data-test="companion">同行旅伴的行程<slot name="account-settings" /></div>' } }))

beforeEach(async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test-key')
  await import('@/stores/auth')
  membership.mockReset().mockResolvedValue(false)
  if (state.store) { state.store.user = null; state.store.openAuthModal.mockReset(); state.store.initializeAuth.mockReset() }
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

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
    expect(state.store?.openAuthModal).toHaveBeenCalledWith('login', '/iceland')
    wrapper.unmount()
  })

  it('keeps an ordinary signed-in nonmember on the public itinerary', async () => {
    state.store!.user = {id:'outsider'}
    const wrapper = mountJourney(); await flushPromises()
    await vi.waitFor(() => expect(wrapper.text()).toContain('尚未加入，請透過邀請連結加入'))
    expect(wrapper.find('[data-test="companion"]').exists()).toBe(false)
    expect(wrapper.find('.journey-navigation').exists()).toBe(false)
    expect(wrapper.text()).toContain('切換帳號')
    wrapper.unmount()
  })

  it('shows membership connection failures as retryable errors rather than an invitation prompt', async () => {
    state.store!.user = { id: 'owner' }
    membership.mockRejectedValue(new Error('Failed to fetch'))
    const wrapper = mountJourney(); await flushPromises()
    await vi.waitFor(() => expect(wrapper.text()).toContain('無法確認旅程資格'))
    expect(wrapper.text()).not.toContain('尚未加入')
    membership.mockResolvedValue(true)
    await wrapper.get('[data-test="retry-membership"]').trigger('click'); await flushPromises()
    await vi.waitFor(() => expect(wrapper.find('[data-test="companion"]').exists()).toBe(true))
    wrapper.unmount()
  })

  it('does not label a pending membership check as not joined', async () => {
    state.store!.user = { id: 'owner' }
    membership.mockReturnValue(new Promise(() => {}))
    const wrapper = mountJourney(); await flushPromises()
    expect(wrapper.text()).toContain('正在確認旅程資格')
    expect(wrapper.text()).not.toContain('尚未加入')
    wrapper.unmount()
  })

  it('ignores a previous account membership response after switching accounts', async () => {
    let resolveOwner!: (value: boolean) => void
    state.store!.user = { id: 'owner' }
    membership.mockImplementation(() => new Promise<boolean>(resolve => { resolveOwner = resolve }))
    const wrapper = mountJourney(); await flushPromises()
    membership.mockResolvedValue(false)
    state.store!.user = { id: 'outsider' }; await flushPromises()
    resolveOwner(true); await flushPromises()
    expect(wrapper.find('[data-test="companion"]').exists()).toBe(false)
    await vi.waitFor(() => expect(wrapper.text()).toContain('尚未加入'))
    wrapper.unmount()
  })

  it('uses a downloaded journey only for its signed-in account while offline', async () => {
    const { saveLocalJourney, withTripId } = await import('@/domain/tripJourney')
    const { icelandJourney } = await import('@/data/icelandJourney')
    const { ICELAND_TRIP_ID } = await import('@/router/iceland')
    const saved=new Map<string,string>()
    vi.stubGlobal('localStorage',{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value)})
    const connection=vi.spyOn(navigator,'onLine','get').mockReturnValue(false)
    saveLocalJourney('offline-member',withTripId(icelandJourney,ICELAND_TRIP_ID))
    state.store!.user={id:'offline-member'}
    const wrapper=mountJourney(); await flushPromises()
    expect(wrapper.find('[data-test="companion"]').exists()).toBe(true)
    expect(membership).not.toHaveBeenCalled()
    state.store!.user={id:'another-account'}; await flushPromises()
    expect(wrapper.find('[data-test="companion"]').exists()).toBe(false)
    wrapper.unmount(); connection.mockRestore()
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

  it('reveals companion tools after authorized membership and removes them on sign-out in the same entry', async () => {
    const wrapper = mountJourney()
    await flushPromises()
    membership.mockResolvedValue(true)
    if (state.store) state.store.user = { id: 'companion' }
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find('[data-test="companion"]').exists()).toBe(true))
    await wrapper.findAll('button').find(b=>b.text()==='登出本機')!.trigger('click')
    expect(state.store?.signOut).toHaveBeenCalledTimes(1)
    if (state.store) state.store.user = null
    await flushPromises()
    expect(wrapper.find('[data-test="companion"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('登入')
    expect(wrapper.find('[aria-label="倫敦前段行程"]').exists()).toBe(true)
    expect(wrapper.find('.prelude-people').exists()).toBe(false)
    wrapper.unmount()
  })
})
