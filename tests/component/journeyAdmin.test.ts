import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import JourneyAdmin from '@/components/trip/JourneyAdmin.vue'
const api = vi.hoisted(() => ({ loadAdminState: vi.fn(), rotateInvite: vi.fn(), revokeInvite: vi.fn(), removeMember: vi.fn(), setEmailReservation: vi.fn() }))
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

it('distinguishes reservation status and saves or clears only through the RPC service', async () => {
 api.loadAdminState.mockResolvedValue({ isAdmin:true,inviteActive:true,members:[
  {id:'member-2',name:'Two',email:null,claimedAt:null,isOwner:false,reservedEmail:null},
  {id:'member-3',name:'Three',email:null,claimedAt:null,isOwner:false,reservedEmail:'three@example.test'},
  {id:'member-1',name:'Owner',email:'owner@example.test',claimedAt:'2026-10-23',isOwner:true,reservedEmail:null},
 ] })
 const wrapper=mount(JourneyAdmin,{props:{tripId:'trip'}}); await flushPromises()
 expect(wrapper.text()).toContain('Two · 未認領')
 expect(wrapper.text()).toContain('Three · 已預綁待登入')
 expect(wrapper.text()).toContain('Owner · 已認領')
 expect(wrapper.find('#reserved-email-member-1').exists()).toBe(false)
 await wrapper.get('#reserved-email-member-2').setValue('two@example.test')
 await wrapper.get('#reserved-email-member-2').trigger('submit'); await flushPromises()
 expect(api.setEmailReservation).toHaveBeenCalledWith('trip','member-2','two@example.test')
 await wrapper.get('[data-test="remove-reservation-member-3"]').trigger('click'); await flushPromises()
 expect(api.setEmailReservation).toHaveBeenCalledWith('trip','member-3',null)
 wrapper.unmount()
})
