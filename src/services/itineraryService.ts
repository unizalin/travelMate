import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type ActivityInsert = Database['public']['Tables']['activities']['Insert']
type ActivityUpdate = Database['public']['Tables']['activities']['Update']

export const itineraryService = {
  // Get all itineraries (days) for a trip
  async fetchItineraries(tripId: string) {
    // 1. Get existing itineraries
    const { data: existingItineraries, error } = await supabase
      .from('itineraries')
      .select(`
        *,
        activities (
          *
        )
      `)
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true })

    if (error) throw error

    // Note: If we want to auto-create missing days, we need trip dates.
    // For now, let's assume valid itineraries exist or we just return what we have.
    // Ideally, we should check if they are complete based on trip duration, but let's keep it simple first.
    return existingItineraries
  },

  // Ensure itineraries exist for all trip days (Helper)
  async ensureItineraries(tripId: string, startDate: string, endDate: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const diffTime = Math.abs(end as any - (start as any))
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    const { data: existing, error: fetchError } = await supabase
      .from('itineraries')
      .select('day_number')
      .eq('trip_id', tripId)

    if (fetchError) throw fetchError

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingDays = new Set(existing?.map((i: any) => i.day_number) || [])
    const toInsert = []

    for (let i = 1; i <= diffDays; i++) {
      if (!existingDays.has(i)) {
        const date = new Date(start)
        date.setDate(date.getDate() + (i - 1))
        toInsert.push({
          trip_id: tripId,
          day_number: i,
          date: date.toISOString().split('T')[0]
        })
      }
    }

    if (toInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await supabase
        .from('itineraries')
        .insert(toInsert as any)

      if (insertError) throw insertError
    }
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
