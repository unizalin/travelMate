import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PreparationChecklist from '@/components/preparation/PreparationChecklist.vue'

const { ensureDefaults, getItems, toggleItem, addItem } = vi.hoisted(() => ({ ensureDefaults: vi.fn(), getItems: vi.fn(), toggleItem: vi.fn(), addItem: vi.fn() }))

vi.mock('@/services/preparationService', () => ({
  preparationService: { ensureDefaults, getItems, toggleItem, addItem, updateItem: vi.fn(), deleteItem: vi.fn() },
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolver => { resolve = resolver })
  return { promise, resolve }
}

describe('PreparationChecklist recovery and scope', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')
    const values = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { clear: () => values.clear(), getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } })
    ensureDefaults.mockReset()
    getItems.mockReset()
    toggleItem.mockReset()
    addItem.mockReset()
  })

  it('syncs an offline toggle and updates the visible state after recovery', async () => {
    ensureDefaults.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    getItems.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([{
      id: 'server-passport', tripId: '00000000-0000-0000-0000-000000000001', category: '必帶', title: '護照/備用照片', isShared: true, ownerId: null, orderIndex: 0, completed: false,
    }])
    toggleItem.mockResolvedValue(undefined)
    const wrapper = mount(PreparationChecklist, { props: { tripId: '00000000-0000-0000-0000-000000000001', ownerId: 'member-a' } })
    await flushPromises()
    await wrapper.findAll('.packing-category').find(button => button.text() === '必帶')!.trigger('click')
    const offlineToggle = wrapper.find('button[aria-label^="護照/備用照片"]')
    await offlineToggle.trigger('click')
    expect(offlineToggle.attributes('aria-label')).toContain('已完成')

    await wrapper.setProps({ canEditShared: true })
    await flushPromises()
    expect(toggleItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'server-passport' }), true)
    expect(wrapper.find('button[aria-label^="護照/備用照片"]').attributes('aria-label')).toContain('已完成')
    wrapper.unmount()
  })

  it('drops a late response when the trip changes while loading', async () => {
    const first = deferred<void>()
    ensureDefaults.mockImplementation((tripId: string) => tripId.endsWith('1') ? first.promise : Promise.resolve())
    getItems.mockImplementation((tripId: string) => Promise.resolve([{
      id: `server-${tripId.slice(-1)}`, tripId, category: '必帶', title: tripId.endsWith('2') ? '第二旅程物品' : '第一旅程物品', isShared: true, ownerId: null, orderIndex: 0, completed: false,
    }]))
    const wrapper = mount(PreparationChecklist, { props: { tripId: '00000000-0000-0000-0000-000000000001', ownerId: 'member-a' } })
    await wrapper.setProps({ tripId: '00000000-0000-0000-0000-000000000002' })
    await flushPromises()
    await wrapper.findAll('.packing-category').find(button => button.text() === '必帶')!.trigger('click')
    expect(wrapper.text()).toContain('第二旅程物品')
    first.resolve()
    await flushPromises()
    expect(wrapper.text()).toContain('第二旅程物品')
    expect(wrapper.text()).not.toContain('第一旅程物品')
    wrapper.unmount()
  })

  it('shows grouped rows in the preparation card and keeps checkbox actions working', async () => {
    ensureDefaults.mockResolvedValue(undefined)
    getItems.mockResolvedValue([{
      id: 'server-passport', tripId: '00000000-0000-0000-0000-000000000001', category: '必帶', title: '護照/備用照片', isShared: true, ownerId: null, orderIndex: 0, completed: false,
    }])
    toggleItem.mockResolvedValue(undefined)
    const wrapper = mount(PreparationChecklist, { props: { tripId: '00000000-0000-0000-0000-000000000001', ownerId: 'member-a', embedded: true } })
    await flushPromises()
    expect(wrapper.findAll('details')).toHaveLength(4)
    expect(wrapper.find('.embedded-category summary').text()).toContain('必帶')
    expect(wrapper.get('#packing-heading').text()).toContain('0/1')
    expect(wrapper.text()).not.toContain('共用')
    expect(wrapper.find('.embedded-item .embedded-kind').exists()).toBe(false)
    const checkbox = wrapper.find('input[type="checkbox"][aria-label="護照/備用照片"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    await checkbox.setValue(true)
    expect(toggleItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'server-passport' }), true)
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.get('#packing-heading').text()).toContain('1/1')
    wrapper.unmount()
  })

  it('keeps existing server items usable when the new category cannot be seeded yet', async () => {
    ensureDefaults.mockRejectedValue(new Error('old category constraint'))
    getItems.mockResolvedValue([{
      id: 'server-key', tripId: '00000000-0000-0000-0000-000000000001', category: '必帶', title: '家裡鑰匙', isShared: true, ownerId: null, orderIndex: 0, completed: true,
    }])
    const wrapper = mount(PreparationChecklist, { props: { tripId: '00000000-0000-0000-0000-000000000001', ownerId: 'member-a', embedded: true } })
    await flushPromises()
    expect(wrapper.text()).toContain('家裡鑰匙')
    expect(wrapper.get('[role="status"]').text()).toContain('範本暫時無法更新')
    expect((wrapper.get('input[aria-label="家裡鑰匙"]').element as HTMLInputElement).checked).toBe(true)
    wrapper.unmount()
  })

  it('shows one 45-item total for a local trip', async () => {
    const wrapper = mount(PreparationChecklist, { props: { tripId: 'local-trip', ownerId: 'member-a', embedded: true } })
    await flushPromises()
    expect(wrapper.get('#packing-heading').text()).toContain('0/45')
    expect(wrapper.findAll('details')).toHaveLength(4)
    wrapper.unmount()
  })

  it('adds missing packing items without resetting a cached completion', async () => {
    localStorage.setItem('travelmate:packing:local-trip:member-a', JSON.stringify([{
      id: 'local-0-0', tripId: 'local-trip', category: '必帶', title: '家裡鑰匙', isShared: true,
      ownerId: null, orderIndex: 0, completed: true,
    }]))
    const wrapper = mount(PreparationChecklist, { props: { tripId: 'local-trip', ownerId: 'member-a', embedded: true } })
    await flushPromises()
    expect(wrapper.get('#packing-heading').text()).toContain('1/45')
    expect((wrapper.get('input[aria-label="家裡鑰匙"]').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.findAll('.embedded-category').map(category => category.find('summary').text()).at(0)).toContain('必帶')
    wrapper.unmount()
  })
})
