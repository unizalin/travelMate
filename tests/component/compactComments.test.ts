import { mount,flushPromises } from '@vue/test-utils'
import { describe,it,expect,vi } from 'vitest'
import ActivityComments from '@/components/trip/ActivityComments.vue'
vi.mock('@/services/activityCommentService',()=>({loadActivityComments:async()=>[{id:'1',parentId:null,content:'入口集合',authorName:'U',memberId:'member-1',createdAt:'2026-10-20T01:00:00Z'}],postActivityComment:vi.fn()}))
it('keeps the itinerary visible until the comment action is opened',async()=>{
 const w=mount(ActivityComments,{props:{tripId:'a00d8537-3054-4f55-be30-7cd0458223e6',activityId:'a',accountId:'user',canPost:true}})
 await flushPromises();expect(w.find('form').exists()).toBe(false);expect(w.text()).not.toContain('入口集合');expect(w.text()).toContain('1 則留言')
 await w.get('[data-action="toggle-comments"]').trigger('click');expect(w.text()).toContain('入口集合');expect(w.find('form').exists()).toBe(true)
 expect(w.text()).not.toContain('重新整理');w.unmount()
})
