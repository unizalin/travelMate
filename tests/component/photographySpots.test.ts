import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PhotographySpots from '@/components/trip/PhotographySpots.vue'

const item = {
  id: 'spot-item', date: '2026-11-01', name: '景點', location: null, order: 1,
  plannedStart: null, plannedEnd: null, actualStart: null, actualEnd: null, status: 'planned' as const,
  photoSpots: [{ id: 'photo-1', title: '取景點', device: 'both' as const, composition: '構圖', sourceLabel: 'PDF' }],
}

describe('PhotographySpots', () => {
  it('keeps shooting guidance compact until the traveler opens it', async () => {
    const wrapper = mount(PhotographySpots, { props: { item } })

    expect(wrapper.get('summary').text()).toBe('拍攝建議')
    expect(wrapper.text()).not.toContain('收藏')
    expect(wrapper.find('details').attributes('open')).toBeUndefined()
    await wrapper.get('summary').trigger('click')
    expect(wrapper.text()).toContain('iPhone')
    expect(wrapper.text()).toContain('相機')
    expect(wrapper.text()).toContain('構圖')
  })

  it('shows sourced camera settings for the confirmed south coast stops', () => {
    const wrapper = mount(PhotographySpots, { props: { item: {
      ...item,
      photoSpots: [{ id: 'photo-skogafoss-scale', title: '瀑布與人物尺度', device: 'both' as const, composition: '人物入鏡', sourceLabel: '2026 Iceland Winter Photo Travel Book' }],
    } } })

    expect(wrapper.text()).toContain('ND64 濾鏡；快門 1/4–2 秒，使用腳架。')
    expect(wrapper.text()).toContain('光圈與 ISO 未提供')
  })
})

it('keeps phone and camera favorites in the signed-in member preference scope', async () => {
  const { ref } = await import('vue')
  const { vi } = await import('vitest')
  const { journeyPhotoKey } = await import('@/services/journeyPhotoContext')
  const update=vi.fn()
  const preferences=ref({tripId:'trip',memberId:'member-2',showPhotography:true,phoneSpotIds:[],cameraSpotIds:[],updatedAt:null})
  const wrapper=mount(PhotographySpots,{props:{item},global:{provide:{[journeyPhotoKey]:{preferences,busy:ref(false),error:ref(''),update}}}})
  await wrapper.findAll('button').find(button=>button.text().includes('收藏手機'))!.trigger('click')
  expect(update).toHaveBeenCalledWith(expect.objectContaining({memberId:'member-2',phoneSpotIds:['photo-1'],cameraSpotIds:[]}))
  preferences.value.showPhotography=false
  await wrapper.vm.$nextTick()
  expect(wrapper.find('details').exists()).toBe(false)
  wrapper.unmount()
})
