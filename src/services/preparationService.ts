import { supabase } from '@/services/supabase'

export interface PreparationItem {
    id: string
    trip_id: string
    user_id: string
    is_shared: boolean
    category: string
    title: string
    description: string | null
    is_completed: boolean
    completed_at: string | null
    completed_by_id: string | null
    completed_by?: {
        display_name: string
        avatar_url: string
    }
    order_index: number
    created_at: string
}

export const preparationService = {
    async getItems(tripId: string) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        // Fetch shared items AND personal items for this user
        const { data, error } = await (supabase
            .from('preparation_items' as any) as any)
            .select(`
                *,
                completed_by:completed_by_id (
                    display_name,
                    avatar_url
                )
            `)
            .eq('trip_id', tripId)
            .or(`is_shared.eq.true,user_id.eq.${user.id}`)
            .order('order_index', { ascending: true })

        if (error) throw error
        return data as PreparationItem[]
    },

    async toggleItem(itemId: string, isCompleted: boolean) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { error } = await (supabase
            .from('preparation_items' as any) as any)
            .update({
                is_completed: isCompleted,
                completed_at: isCompleted ? new Date().toISOString() : null,
                completed_by_id: isCompleted ? user.id : null
            })
            .eq('id', itemId)

        if (error) throw error
    },

    async updateItem(itemId: string, updates: Partial<PreparationItem>) {
        const { error } = await (supabase
            .from('preparation_items' as any) as any)
            .update(updates)
            .eq('id', itemId)

        if (error) throw error
    },

    async addItem(item: Partial<PreparationItem>) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { data, error } = await (supabase
            .from('preparation_items' as any) as any)
            .insert({ ...item, user_id: user.id })
            .select()
            .single()

        if (error) throw error
        return data as PreparationItem
    },

    async deleteItem(itemId: string) {
        const { error } = await (supabase
            .from('preparation_items' as any) as any)
            .delete()
            .eq('id', itemId)

        if (error) throw error
    },

    async initializeDefaults(tripId: string) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { count, error: countError } = await (supabase
            .from('preparation_items' as any) as any)
            .select('*', { count: 'exact', head: true })
            .eq('trip_id', tripId)
            .eq('user_id', user.id)
            .eq('is_shared', false)

        if (countError) throw countError

        const itemsToInsert: any[] = []

        if (!count || count === 0) {
            const personalDefaults = [
                { category: '證件文件', items: ['護照', '簽證', '旅遊保險'] },
                { category: '行李打包', items: ['雪衣雪褲', '保暖內衣', '換洗衣物', '盥洗用品', '鞋子'] },
                { category: '個人裝備', items: ['滑雪板雪靴', '安全帽', '護具', '雪鏡', '手套'] },
                { category: '電子設備', items: ['手機充電器', '行動電源', '相機', '轉接頭'] },
                { category: '藥品用品', items: ['常備藥', '防曬乳', '暖暖包', 'OK繃'] },
                { category: '個人財務', items: ['換匯', '準備生活費現金'] }
            ]
            itemsToInsert.push(...personalDefaults.flatMap((cat, catIdx) =>
                cat.items.map((title, itemIdx) => ({
                    trip_id: tripId,
                    user_id: user.id,
                    is_shared: false,
                    category: cat.category,
                    title: title,
                    order_index: (catIdx + 10) * 100 + itemIdx,
                    is_completed: false
                }))
            ))
        }

        const { count: sharedCount } = await (supabase
            .from('preparation_items' as any) as any)
            .select('*', { count: 'exact', head: true })
            .eq('trip_id', tripId)
            .eq('is_shared', true)

        if (!sharedCount || sharedCount === 0) {
            const sharedDefaults = [
                { category: '團體公務', items: ['訂房確認', '租車/交通預約', '團體保險', '集合時間確認'] },
                { category: '行程準備', items: ['下載離線地圖', '餐廳訂位', '門票預約'] }
            ]
            itemsToInsert.push(...sharedDefaults.flatMap((cat, catIdx) =>
                cat.items.map((title, itemIdx) => ({
                    trip_id: tripId,
                    user_id: user.id,
                    is_shared: true,
                    category: cat.category,
                    title: title,
                    order_index: catIdx * 100 + itemIdx,
                    is_completed: false
                }))
            ))
        }

        if (itemsToInsert.length > 0) {
            const { error: insertError } = await (supabase
                .from('preparation_items' as any) as any)
                .insert(itemsToInsert)

            if (insertError) throw insertError
        }
    }
}
