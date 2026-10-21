import { PACKING_TEMPLATE, mergePackingItems, type PackingCategory, type PackingItem } from '@/domain/packingChecklist'
import { supabase } from '@/services/supabase'

type RemotePackingRow = Omit<PackingItem, 'completed'> & { completed: boolean }

function toRows(data: unknown): PackingItem[] {
  if (!Array.isArray(data)) return []
  return data.map(row => {
    const value = row as RemotePackingRow & Record<string, unknown>
    return {
      id: value.id as string,
      tripId: (value.tripId ?? value.trip_id) as string,
      category: value.category as PackingCategory,
      title: value.title as string,
      isShared: (value.isShared ?? value.is_shared) as boolean,
      ownerId: (value.ownerId ?? value.owner_id ?? null) as string | null,
      orderIndex: (value.orderIndex ?? value.order_index ?? 0) as number,
      completed: Boolean(value.completed),
    }
  })
}

export const preparationService = {
  async getItems(tripId: string, ownerId: string | null): Promise<PackingItem[]> {
    const { data, error } = await supabase.rpc('tripbook_load_packing_items' as never, { p_trip_id: tripId } as never)
    if (error) throw error
    return mergePackingItems(toRows(data), ownerId)
  },

  async ensureDefaults(tripId: string): Promise<void> {
    const items = PACKING_TEMPLATE.flatMap((category, categoryIndex) => category.items.map((title, itemIndex) => ({ category: category.category, title, orderIndex: categoryIndex * 100 + itemIndex })))
    const { error } = await supabase.rpc('tripbook_ensure_packing_template' as never, { p_trip_id: tripId, p_items: items } as never)
    if (error) throw error
  },

  async toggleItem(item: PackingItem, completed: boolean): Promise<void> {
    const { error } = await supabase.rpc('tripbook_set_packing_completion' as never, { p_item_id: item.id, p_completed: completed } as never)
    if (error) throw error
  },

  async addItem(tripId: string, category: PackingCategory, title: string, isShared: boolean, orderIndex = 1000): Promise<PackingItem> {
    const { data, error } = await supabase.rpc('tripbook_add_packing_item' as never, { p_trip_id: tripId, p_category: category, p_title: title, p_is_shared: isShared, p_order_index: orderIndex } as never)
    if (error) throw error
    return toRows([data])[0]
  },

  async updateItem(itemId: string, title: string): Promise<void> {
    const { error } = await supabase.rpc('tripbook_update_packing_item' as never, { p_item_id: itemId, p_title: title } as never)
    if (error) throw error
  },

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase.rpc('tripbook_delete_packing_item' as never, { p_item_id: itemId } as never)
    if (error) throw error
  },
}
