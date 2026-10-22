import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const service = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), void: vi.fn() }))
vi.mock('@/services/journeyLedgerService', () => ({ loadJourneyLedger: service.load, saveJourneyLedgerEntry: service.save, voidJourneyLedgerEntry: service.void }))
import JourneyLedger from '@/components/trip/JourneyLedger.vue'
const props={ tripId: 'journey-a', accountId: 'account-a', members: [{ id: 'm1', displayName: 'A' }, { id: 'm2', displayName: 'B' }], selfMemberId: 'm1' }
const entry={ id:'30000000-0000-0000-0000-000000000001', kind:'expense',title:'Dinner',currency:'GBP',amountMinor:100,payerId:'m1',allocations:[{memberId:'m1',amountMinor:50},{memberId:'m2',amountMinor:50}],occurredOn:'2026-10-24',revision:1,createdAt:'2026-10-24T12:00:00Z',canManage:true }
beforeEach(()=> {service.load.mockReset().mockResolvedValue([]);service.save.mockReset().mockResolvedValue([entry]);service.void.mockReset().mockResolvedValue([])})
describe('shared journey ledger',()=>{
 it('saves an expense for explicitly selected participants and displays confirmed cloud data',async()=>{
  const wrapper=mount(JourneyLedger,{props});await flushPromises()
  await wrapper.findAll('button').find(button=>button.text().includes('新增支出'))?.trigger('click')
  const form=wrapper.get('form')
  await form.get('input[maxlength="120"]').setValue('Dinner')
  await form.get('input[inputmode="numeric"]').setValue('1200')
  await form.findAll('input[type="checkbox"]')[1]?.setValue(true)
  await form.trigger('submit');await flushPromises()
  expect(service.save).toHaveBeenCalledWith('journey-a',expect.objectContaining({title:'Dinner',amountMinor:1200,currency:'ISK',payerId:'m1',participants:['m2'],expectedRevision:0}))
  expect(wrapper.text()).toContain('已儲存到共同帳目')
  expect(wrapper.find('form').exists()).toBe(false)
  wrapper.unmount()
 })
 it('keeps the form and error when save confirmation fails',async()=>{
  service.save.mockRejectedValue(new Error('帳目已更新，請重新載入'))
  const wrapper=mount(JourneyLedger,{props});await flushPromises()
  await wrapper.findAll('button').find(button=>button.text().includes('新增支出'))?.trigger('click')
  await wrapper.get('input[maxlength="120"]').setValue('Dinner')
  await wrapper.get('input[inputmode="numeric"]').setValue('1200')
  await wrapper.findAll('input[type="checkbox"]')[0]?.setValue(true)
  await wrapper.get('form').trigger('submit');await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('帳目已更新')
  expect(wrapper.find('form').exists()).toBe(true)
  wrapper.unmount()
 })
 it('requires confirmation before soft voiding a manageable record',async()=>{
  service.load.mockResolvedValue([entry]);const wrapper=mount(JourneyLedger,{props});await flushPromises()
  await wrapper.findAll('button').find(button=>button.text()==='作廢')?.trigger('click')
  expect(service.void).not.toHaveBeenCalled()
  await wrapper.get('.ledger-confirm button').trigger('click');await flushPromises()
  expect(service.void).toHaveBeenCalledWith('journey-a',entry)
  expect(wrapper.text()).toContain('這筆紀錄不再計入分帳')
  wrapper.unmount()
 })
 it('ignores an old account response and disables offline edits',async()=>{
  let resolveOld:(entries:unknown[])=>void=()=>{}
  service.load.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve})).mockResolvedValue([])
  const wrapper=mount(JourneyLedger,{props});await wrapper.setProps({accountId:'account-b'});await flushPromises()
  resolveOld([entry]);await flushPromises()
  expect(wrapper.text()).not.toContain('Dinner')
  await wrapper.setProps({disabled:true})
  expect(wrapper.findAll('button').every(button=>button.attributes('disabled')!==undefined)).toBe(true)
  wrapper.unmount()
 })
})
