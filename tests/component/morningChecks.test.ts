import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MorningChecks from '@/components/trip/MorningChecks.vue'

describe('MorningChecks', () => {
  it('starts compact and expands on request', async () => {
    const wrapper = mount(MorningChecks, { props: { date: '2026-11-02', accountId: 'member-1', tripId: 'tripbook-iceland-2026' } })

    expect(wrapper.find('button').text()).toContain('0/4')
    expect(wrapper.find('.checks').exists()).toBe(false)
    await wrapper.find('button').trigger('click')
    expect(wrapper.findAll('.checks input')).toHaveLength(4)
    wrapper.unmount()
  })
})
