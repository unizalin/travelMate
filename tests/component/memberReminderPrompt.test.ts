import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { beforeEach, expect, it, vi } from 'vitest'
const device=vi.hoisted(()=>({current:undefined as unknown}))
vi.mock('@/composables/useDeviceReminders',()=>({useDeviceReminders:()=>device.current}))
beforeEach(()=>vi.resetModules())
async function fixture({ready=true,install=false,aurora=false,ios=false,canInstall=false,itinerary=true}={}) {
 const state={ready:ref(ready),todo:ref({install,aurora}),ios,canInstall:ref(canInstall),install:vi.fn()}
 device.current=state
 const {default:Component}=await import('@/components/trip/MemberReminderPrompt.vue')
 return {state,Component,wrapper:mount(Component,{props:{itinerary}})}
}
it('waits for confirmed membership/device state and itinerary before showing',async()=>{
 const {wrapper,state}=await fixture({ready:false,install:true,itinerary:false})
 expect(wrapper.find('[role=dialog]').exists()).toBe(false)
 state.ready.value=true;await nextTick();expect(wrapper.find('[role=dialog]').exists()).toBe(false)
 await wrapper.setProps({itinerary:true});expect(wrapper.find('[role=dialog]').exists()).toBe(true)
 wrapper.unmount()
})
it('iOS shows Safari instructions without an install button',async()=>{
 const {wrapper}=await fixture({install:true,ios:true})
 expect(wrapper.text()).toContain('Safari');expect(wrapper.text()).toContain('LINE')
 expect(wrapper.findAll('button').some(button=>button.text()==='安裝 travelMate')).toBe(false)
 wrapper.unmount()
})
it('Android uses captured install prompt and otherwise shows menu instructions',async()=>{
 const {wrapper,state}=await fixture({install:true,canInstall:true})
 await wrapper.findAll('button').find(button=>button.text()==='安裝 travelMate')?.trigger('click')
 expect(state.install).toHaveBeenCalledOnce()
 state.canInstall.value=false;await nextTick();expect(wrapper.text()).toContain('瀏覽器選單')
 wrapper.unmount()
})
it('standalone prompt links to aurora settings; success removes it immediately',async()=>{
 const {wrapper,state}=await fixture({aurora:true})
 expect(wrapper.text()).toContain('整趟極光提醒')
 state.todo.value={install:false,aurora:false};await nextTick()
 expect(wrapper.find('[role=dialog]').exists()).toBe(false)
 wrapper.unmount()
})
it('later suppresses repeats in this opening including component remount',async()=>{
 const {wrapper,Component}=await fixture({aurora:true})
 await wrapper.findAll('button').find(button=>button.text()==='稍後再說')?.trigger('click')
 await wrapper.setProps({itinerary:false});await wrapper.setProps({itinerary:true})
 expect(wrapper.find('[role=dialog]').exists()).toBe(false);wrapper.unmount()
 const remount=mount(Component,{props:{itinerary:true}})
 expect(remount.find('[role=dialog]').exists()).toBe(false);remount.unmount()
})
it('active trip subscription or nonmember produces no prompt',async()=>{
 const {wrapper}=await fixture()
 expect(wrapper.find('[role=dialog]').exists()).toBe(false);wrapper.unmount()
})
it('main action emits navigation to expanded aurora card',async()=>{
 const {wrapper}=await fixture({aurora:true})
 await wrapper.findAll('button').find(button=>button.text()==='前往開啟整趟提醒')?.trigger('click')
 expect(wrapper.emitted('aurora')).toHaveLength(1)
 expect(wrapper.find('[role=dialog]').exists()).toBe(false);wrapper.unmount()
})
