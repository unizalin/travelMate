import { describe, expect, it } from 'vitest'
import { PACKING_TEMPLATE, mergePackingItems, type PackingItem } from '@/domain/packingChecklist'

describe('packing checklist', () => {
  it('contains the 45-item four-category template and phone straps once', () => {
    expect(PACKING_TEMPLATE.map(group => group.category)).toEqual(['必帶', '衣服', '盥洗', '其他'])
    const titles = PACKING_TEMPLATE.flatMap(category => category.items)
    expect(titles).toHaveLength(45)
    expect(titles).toContain('手機掛繩')
    expect(titles.filter(title => title === '手機掛繩')).toHaveLength(1)
    expect(titles).toContain('家裡鑰匙')
    expect(titles).toContain('國際駕照')
  })

  it('keeps shared template items and private additions separate by owner', () => {
    const items: PackingItem[] = [
      { id: 'shared-1', tripId: 'trip', category: '必帶', title: '護照', isShared: true, ownerId: null, orderIndex: 0, completed: false },
      { id: 'departure-1', tripId: 'trip', category: '衣服', title: '預辦登機', isShared: true, ownerId: null, orderIndex: 1000, completed: true },
      { id: 'mine-1', tripId: 'trip', category: '其他', title: '我的相機', isShared: false, ownerId: 'member-a', orderIndex: 1, completed: true },
      { id: 'theirs-1', tripId: 'trip', category: '其他', title: '別人的藥', isShared: false, ownerId: 'member-b', orderIndex: 2, completed: true },
    ]
    expect(mergePackingItems(items, 'member-a').map(item => item.title)).toEqual(['護照', '預辦登機', '我的相機'])
    expect(mergePackingItems(items, null).map(item => item.title)).toEqual(['護照', '預辦登機'])
  })
})
