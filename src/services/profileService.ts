import { supabase } from '@/services/supabase'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export const profileService = {
    async getProfile(userId: string): Promise<Profile | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null // Not found
            throw error
        }
        return data
    },

    async updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
        const { data, error } = await supabase
            .from('profiles')
            .upsert({ id: userId, ...updates } as any)
            .select()
            .single()

        if (error) throw error
        return data
    },
}
