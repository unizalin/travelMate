import { supabase } from '@/services/supabase'
import type { Database } from '@/types/database'

type TripInsert = Database['public']['Tables']['trips']['Insert']

export const tripService = {
  async getTrips() {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) throw error
    return data
  },

  async getTripById(id: string) {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        trip_members (
          *,
          profiles (*)
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async createTrip(trip: TripInsert) {
    // 1. Create trip
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newTrip, error: tripError } = await supabase
      .from('trips')
      .insert(trip as any)
      .select()
      .single()

    if (tripError) throw tripError

    // 2. Add creator as organizer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberData: any = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trip_id: (newTrip as any).id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user_id: (newTrip as any).created_by,
      role: 'organizer'
    }

    const { error: memberError } = await supabase
      .from('trip_members')
      .insert(memberData)

    if (memberError) {
      throw memberError
    }

    return newTrip
  },

  async joinTrip(inviteCode: string, userId: string) {
    // 1. Find trip by invite code (using RPC to bypass RLS)
    const { data: tripId, error: findError } = await supabase
      .rpc('get_trip_id_by_invite_code' as any, { code: inviteCode } as any)

    if (findError || !tripId) throw new Error('Invalid invite code')

    // 2. Add member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: joinError } = await supabase
      .from('trip_members')
      .insert({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trip_id: tripId,
        user_id: userId,
        role: 'member'
      } as any)

    if (joinError) {
      if (joinError.code === '23505') throw new Error('You are already a member of this trip')
      throw joinError
    }

    return tripId
  },

  async deleteTrip(id: string) {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async updateTrip(id: string, updates: Partial<Database['public']['Tables']['trips']['Update']>) {
    const { data, error } = await (supabase.from('trips') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
