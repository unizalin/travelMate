import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PublicPreparation from '@/components/trip/PublicPreparation.vue'

describe('public packing checklist', () => {
  const values = new Map<string, string>()

  beforeEach(() => {
    values.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows the four requested categories and keeps ticks after remount', async () => {
    const first = mount(PublicPreparation)
    expect(first.get('.packing-list h3').text()).toContain('出國行李清單')
    expect(first.get('.packing-list h3').text()).toContain('0/45')
    expect(first.get('.packing-list').element.closest('section')?.querySelector('h2')?.textContent).toContain('出發前清單')
    expect(first.findAll('section')[2].findAll('label').slice(0, 4).map(label => label.text())).toEqual(['護照、駕照、國際駕照與電子票券', '租車保險與還車規定', '本人測試推播並下載離線行程', 'Sky Lagoon 訂位與入場時間'])
    expect(first.findAll('.packing-list details')).toHaveLength(4)
    expect(first.findAll('.packing-list label').filter(label => label.text() === '手機掛繩')).toHaveLength(1)

    const key = first.findAll('.packing-list label').find(label => label.text() === '家裡鑰匙')
    expect(key).toBeDefined()
    await key!.get('input').setValue(true)
    expect(values.get('tripbook.prep:public')).toContain('家裡鑰匙')
    first.unmount()

    const restored = mount(PublicPreparation)
    const restoredKey = restored.findAll('.packing-list label').find(label => label.text() === '家裡鑰匙')
    expect((restoredKey!.get('input').element as HTMLInputElement).checked).toBe(true)
    restored.unmount()
  })
})
