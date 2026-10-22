import {flushPromises,mount} from '@vue/test-utils'
import {expect,it,vi} from 'vitest'
import JourneyMyPage from '@/components/trip/JourneyMyPage.vue'
import {icelandJourney} from '@/data/icelandJourney'
vi.mock('@/composables/useDeviceReminders',async()=>{const {ref}=await import('vue');return {useDeviceReminders:()=>({todo:ref({install:false,aurora:false}),state:ref({enabled:false}),status:ref('未開啟整趟極光提醒'),help:ref(false),canInstall:ref(false),install:vi.fn()})}})
it('shows identity sync and collapsed device status without photo settings',async()=>{
 const stored=new Map<string,string>()
 vi.stubGlobal('localStorage',{getItem:(key:string)=>stored.get(key)??null,setItem:(key:string,value:string)=>stored.set(key,value),removeItem:(key:string)=>stored.delete(key)})
 const wrapper=mount(JourneyMyPage,{props:{identityName:'U',syncStatus:'已同步',tripId:'fixture',accountId:'fixture',journey:icelandJourney,flightNames:[],packingRemaining:3,offline:false,canEdit:true},slots:{account:'<div class="account-row">登入帳號<strong>member@example.test</strong></div>'},global:{stubs:{JourneyLedger:true,TripPreparation:true,AuroraReminderSettings:true}}})
 await flushPromises()
 expect(wrapper.get('.identity-card').text()).toContain('已同步')
 expect(wrapper.text()).toContain('帳號與裝置')
 expect(wrapper.text()).toContain('member@example.test')
 expect(wrapper.findAll('.device-row summary').map(row=>row.text())).toEqual(['離線行程未下載','通知提醒未開啟整趟極光提醒'])
 localStorage.setItem('tripbook.prep:fixture:fixture:offline','2026-10-22T12:00:00Z')
 wrapper.getComponent({name:'TripPreparation'}).vm.$emit('offline-updated')
 await flushPromises()
 expect(wrapper.findAll('.device-row summary')[0].text()).toContain('已下載・最近同步')
 localStorage.removeItem('tripbook.prep:fixture:fixture:offline')
 expect(wrapper.text()).not.toContain('攝影偏好')
 expect(wrapper.text()).not.toContain('收藏')
 await wrapper.findAll('button').find(button=>button.text().includes('行李尚有'))?.trigger('click')
 expect(wrapper.emitted('preparation')).toHaveLength(1)
 wrapper.unmount()
 vi.unstubAllGlobals()
})
