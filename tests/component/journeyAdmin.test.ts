import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import JourneyAdmin from '@/components/trip/JourneyAdmin.vue'
const api = vi.hoisted(() => ({ loadAdminState: vi.fn(), rotateInvite: vi.fn(), revokeInvite: vi.fn(), removeMember: vi.fn() }))
vi.mock('@/services/journeyInviteService', () => api)
beforeEach(() => { vi.clearAllMocks() })
it('shows no management controls to a nonowner', async () => {
 api.loadAdminState.mockResolvedValue({ isAdmin: false }); const wrapper=mount(JourneyAdmin); await flushPromises(); expect(wrapper.find('button').exists()).toBe(false); wrapper.unmount()
})
it('clears a generated link after revocation and warns when all identities are claimed', async () => {
 api.loadAdminState.mockResolvedValue({ isAdmin:true,inviteActive:true,members:Array.from({length:6},(_,i)=>({id:`member-${i+1}`,name:`person ${i}`,email:`person${i}@example.test`,claimedAt:'2026-10-22T00:00:00Z',isOwner:i===0})) })
 api.rotateInvite.mockResolvedValue('c'.repeat(64)); api.revokeInvite.mockResolvedValue(null)
 const wrapper=mount(JourneyAdmin); await flushPromises(); expect(wrapper.text()).toContain('建議撤銷邀請連結')
 await wrapper.get('[data-test="rotate-invite"]').trigger('click'); await flushPromises(); expect(wrapper.get('input[aria-label="邀請連結"]').element).toHaveProperty('value',expect.stringContaining('c'.repeat(64)))
 await wrapper.get('[data-test="revoke-invite"]').trigger('click'); await flushPromises(); expect(wrapper.find('input[aria-label="邀請連結"]').exists()).toBe(false); wrapper.unmount()
})
