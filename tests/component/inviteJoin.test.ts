import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InviteJoin from '@/views/InviteJoin.vue'
import IcelandJourney from '@/views/IcelandJourney.vue'
const state = vi.hoisted(() => ({ user: { id: 'guest' } as { id: string } | null, preview: vi.fn(), join: vi.fn(), oauth: vi.fn(), joined: false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ get user() { return state.user }, initializeAuth: async () => {}, signInWithOAuth: state.oauth, openAuthModal: vi.fn() }) }))
vi.mock('@/services/journeyInviteService', () => ({ previewInvite: state.preview, joinInvite: state.join }))
vi.mock('@/services/journeyService', () => ({ canReadJourney: async () => state.joined }))
vi.mock('@/views/IcelandPlanner.vue', () => ({ default: { template: '<div data-test="member-journey">會員旅程</div>' } }))
vi.mock('@/services/tripWeatherService', () => ({ loadDayForecast: async () => ({ kind: 'unavailable', fetchedAt: new Date().toISOString() }) }))
async function setup(memberEntry = false) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/iceland/join', component: InviteJoin }, { path: '/iceland', component: memberEntry ? IcelandJourney : { template: '<div>公開行程</div>' } }] })
  await router.push('/iceland/join?token=' + 'a'.repeat(64))
  const wrapper = mount(InviteJoin, { global: { plugins: [router] } }); await flushPromises(); return { wrapper, router }
}
beforeEach(() => { vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test-key'); state.joined = false; state.user = { id: 'guest' }; state.preview.mockReset().mockResolvedValue({ members: [{ id: 'member-1', name: 'U', claimed: true }, { id: 'member-4', name: 'Rosanne 🌹', claimed: false }] }); state.join.mockReset().mockResolvedValue({ tripId: 'trip' }) })
afterEach(() => { vi.unstubAllEnvs() })
describe('Invitation joining', () => {
  it('disables claimed identities and confirms before granting membership', async () => {
    const { wrapper, router } = await setup()
    expect(wrapper.get('button[data-member="member-1"]').attributes('disabled')).toBeDefined()
    await wrapper.get('button[data-member="member-4"]').trigger('click')
    expect(wrapper.text()).toContain('你選擇的是 Rosanne 🌹')
    expect(state.join).not.toHaveBeenCalled()
    await wrapper.get('[data-test="confirm-identity"]').trigger('click'); await flushPromises()
    expect(state.join).toHaveBeenCalledWith('a'.repeat(64), 'member-4')
    expect(router.currentRoute.value.path).toBe('/iceland'); wrapper.unmount()
  })
  it('enters the same membership gate after claiming and on a fresh visit', async () => {
    state.join.mockImplementation(async () => { state.joined = true; return { tripId: 'trip' } })
    const { wrapper, router } = await setup(true)
    await wrapper.get('button[data-member="member-4"]').trigger('click')
    await wrapper.get('[data-test="confirm-identity"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/iceland?section=flights')
    wrapper.unmount()
    const member = mount(IcelandJourney, { global: { plugins: [router] } }); await flushPromises()
    await vi.waitFor(() => expect(member.find('[data-test="member-journey"]').exists()).toBe(true))
    expect(member.text()).not.toContain('尚未加入'); member.unmount()
    const refreshed = mount(IcelandJourney, { global: { plugins: [router] } }); await flushPromises()
    await vi.waitFor(() => expect(refreshed.find('[data-test="member-journey"]').exists()).toBe(true))
    refreshed.unmount()
  })

  it('returns an already claimed invite account to the same member entry', async () => {
    state.joined = true
    state.preview.mockResolvedValue({ joined: true, members: [] })
    const { wrapper, router } = await setup(true)
    expect(router.currentRoute.value.fullPath).toBe('/iceland?section=flights')
    expect(state.join).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('offers Google login with a preserved invitation destination', async () => {
    state.user = null; const { wrapper } = await setup()
    expect(wrapper.text()).toContain('Safari 或 Chrome')
    await wrapper.get('[data-test="invite-login"]').trigger('click')
    expect(state.oauth).toHaveBeenCalledWith('google','/iceland/join?token='+'a'.repeat(64)); expect(sessionStorage.getItem('tripbook-invite-return')).toBe('/iceland/join?token='+'a'.repeat(64)); sessionStorage.clear(); wrapper.unmount()
  })
  it('shows an invalid invitation without exposing the identity list', async () => {
    state.preview.mockRejectedValue(new Error('邀請連結已失效，請向建立者索取新連結。'))
    const { wrapper } = await setup(); expect(wrapper.text()).toContain('邀請連結已失效'); expect(wrapper.find('[data-member]').exists()).toBe(false); wrapper.unmount()
  })
})
