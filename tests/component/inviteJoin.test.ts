import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InviteJoin from '@/views/InviteJoin.vue'
const state = vi.hoisted(() => ({ user: { id: 'guest' } as { id: string } | null, preview: vi.fn(), join: vi.fn(), oauth: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ get user() { return state.user }, initializeAuth: async () => {}, signInWithOAuth: state.oauth, openAuthModal: vi.fn() }) }))
vi.mock('@/services/journeyInviteService', () => ({ previewInvite: state.preview, joinInvite: state.join }))
async function setup() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/iceland/join', component: InviteJoin }, { path: '/iceland', component: { template: '<div>公開行程</div>' } }] })
  await router.push('/iceland/join?token=' + 'a'.repeat(64))
  const wrapper = mount(InviteJoin, { global: { plugins: [router] } }); await flushPromises(); return { wrapper, router }
}
beforeEach(() => { state.user = { id: 'guest' }; state.preview.mockReset().mockResolvedValue({ members: [{ id: 'member-1', name: 'U', claimed: true }, { id: 'member-4', name: 'Rosanne 🌹', claimed: false }] }); state.join.mockReset().mockResolvedValue({ tripId: 'trip' }) })
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
