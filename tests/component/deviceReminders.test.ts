import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { expect, it, vi } from 'vitest'
import { useDeviceReminders } from '@/composables/useDeviceReminders'
const api=vi.hoisted(()=>({current:vi.fn(),config:vi.fn()}))
vi.mock('@/services/auroraPushService',()=>({deviceStandalone:()=>true,getPushConfig:api.config,currentPushState:api.current,preparePushRegistration:async()=>({})}))
it('one member device state powers children, waits for membership, and reacts immediately to subscription changes',async()=>{
 vi.stubGlobal('PushManager',class {})
 Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{}})
 api.config.mockResolvedValue({publicKey:'fixture'})
 api.current.mockResolvedValue({enabled:true,scope:'tonight',expiresAt:'2026-11-07T12:00:00.000Z'})
 const accountId=ref('fixture'),member=ref(false)
 const seen:ReturnType<typeof useDeviceReminders>[]=[]
 const Child=defineComponent({setup(){seen.push(useDeviceReminders());return ()=>null}})
 const Root=defineComponent({components:{Child},setup(){seen.push(useDeviceReminders({accountId,member}));return {}},template:'<Child />'})
 const wrapper=mount(Root);await flushPromises()
 expect(seen[0]).toBe(seen[1]);expect(api.current).not.toHaveBeenCalled()
 expect(seen[0].ready.value).toBe(false);expect(seen[0].todo.value).toEqual({install:false,aurora:false})
 member.value=true;await flushPromises()
 expect(seen[0].enabled.value).toBe(false);expect(seen[0].ready.value).toBe(true);expect(seen[0].todo.value.aurora).toBe(true)
 window.dispatchEvent(new CustomEvent('tripbook-push-state',{detail:{enabled:true,scope:'trip',expiresAt:'2026-11-07T12:00:00.000Z'}}))
 expect(seen[0].enabled.value).toBe(true);expect(seen[0].todo.value.aurora).toBe(false)
 expect(seen[0].status.value).toContain('11/7 12:00')
 window.dispatchEvent(new CustomEvent('tripbook-push-state',{detail:{enabled:false}}))
 expect(seen[0].enabled.value).toBe(false)
 member.value=false;await flushPromises();expect(seen[0].ready.value).toBe(false)
 wrapper.unmount();vi.unstubAllGlobals()
 Reflect.deleteProperty(navigator,'serviceWorker')
})
