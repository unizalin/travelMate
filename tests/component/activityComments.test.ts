import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ActivityComments from '@/components/trip/ActivityComments.vue'
const api = vi.hoisted(() => ({ load: vi.fn(), post: vi.fn() }))
vi.mock('@/services/activityCommentService', () => ({ loadActivityComments: api.load, postActivityComment: api.post }))
const props = { tripId: 'a00d8537-3054-4f55-be30-7cd0458223e6', activityId: 'stop-1', accountId: 'account-a', canPost: true }
const comment = { id: 'c1', parentId: null, content: '這裡下午拍比較漂亮', authorName: 'U', memberId: 'member-1', createdAt: '2026-10-19T08:00:00Z' }
beforeEach(() => { vi.resetAllMocks(); api.load.mockResolvedValue([comment]) })
describe('Activity comment threads', () => {
 it('shows names and timestamps and sends a separate reply without rewriting the original', async () => {
  api.post.mockResolvedValue({ ...comment, id: 'c2', parentId: 'c1', content: '好，下午去' })
  const wrapper = mount(ActivityComments, { props })
  await flushPromises()
  await wrapper.get('[data-action="toggle-comments"]').trigger('click')
  expect(wrapper.text()).toContain(comment.content)
  expect(wrapper.text()).toContain('U')
  expect(wrapper.find('time').exists()).toBe(true)
  await wrapper.get('[data-action="reply"]').trigger('click')
  await wrapper.get('textarea').setValue('好，下午去')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(api.post).toHaveBeenCalledWith(expect.objectContaining({ parentId: 'c1', content: '好，下午去' }))
  expect(wrapper.text()).toContain(comment.content)
  expect(wrapper.text()).toContain('好，下午去')
  wrapper.unmount()
 })
 it('keeps a failed message for retry and prevents duplicate clicks', async () => {
  let fail: (error: Error) => void = () => {}
  api.post.mockImplementation(() => new Promise((_, reject) => { fail = reject }))
  const wrapper = mount(ActivityComments, { props })
  await flushPromises()
  await wrapper.get('[data-action="toggle-comments"]').trigger('click')
  await wrapper.get('textarea').setValue('集合在門口')
  await wrapper.get('form').trigger('submit')
  await wrapper.get('form').trigger('submit')
  expect(api.post).toHaveBeenCalledTimes(1)
  fail(new Error('連線失敗'))
  await flushPromises()
  expect(wrapper.get('textarea').element.value).toBe('集合在門口')
  expect(wrapper.text()).toContain('連線失敗')
  wrapper.unmount()
 })
 it('preserves earlier content and prevents posting from a read-only account', async () => {
  const wrapper = mount(ActivityComments, { props: { ...props, canPost: false, legacyMemo: { content: '原本的提醒', updatedBy: 'someone', updatedByName: 'YU', updatedAt: '2026-10-18T08:00:00Z' } } })
  await flushPromises()
  await wrapper.get('[data-action="toggle-comments"]').trigger('click')
  expect(wrapper.text()).toContain('原本的提醒')
  expect(wrapper.get('textarea').attributes('disabled')).toBeDefined()
  await wrapper.get('form').trigger('submit')
  expect(api.post).not.toHaveBeenCalled()
  wrapper.unmount()
 })
 it('ignores an old account response after switching accounts', async () => {
  let finish: (value: typeof comment[]) => void = () => {}
  api.load.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  api.load.mockResolvedValueOnce([])
  const wrapper = mount(ActivityComments, { props })
  await wrapper.setProps({ accountId: 'account-b' })
  await flushPromises()
  finish([comment]); await flushPromises()
  expect(wrapper.text()).not.toContain(comment.content)
  wrapper.unmount()
 })
})
