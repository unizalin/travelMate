import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type ActivityInsert = Database['public']['Tables']['activities']['Insert']
type ActivityUpdate = Database['public']['Tables']['activities']['Update']

export const activityService = {
  // Get activities for a specific itinerary
  async getActivitiesByItinerary(itineraryId: string) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('itinerary_id', itineraryId)
      .order('order_index')

    if (error) throw error
    return data
  },

  async createActivity(activity: ActivityInsert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('activities')
      .insert(activity as any)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateActivity(id: string, updates: ActivityUpdate) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('activities')
      // @ts-ignore
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteActivity(id: string) {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
