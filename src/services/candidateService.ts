import { supabase } from '@/services/supabase'

export interface CandidateActivity {
    id: string
    trip_id: string
    name: string
    location: string
    latitude: number | null
    longitude: number | null
    description: string | null
    created_by: string
    creator_name: string
    status: 'pending' | 'added' | 'rejected'
    google_maps_url: string | null
    added_to_day: number | null
    added_at: string | null
    created_at: string
    creator?: {
        display_name: string
        avatar_url: string
    }
    likes?: {
        user_id: string
    }[]
    like_count?: number
}

export const candidateService = {
    async getCandidates(tripId: string) {
        const { data, error } = await supabase
            .from('candidate_activities')
            .select(`
        *,
        creator:created_by (
          display_name,
          avatar_url
        ),
        likes:candidate_likes (
          user_id
        )
      `)
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return (data as any[]).map(item => ({
            ...item,
            like_count: item.likes?.length || 0
        })) as CandidateActivity[]
    },

    async addCandidate(candidate: Partial<CandidateActivity>) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error } = await (supabase
            .from('candidate_activities' as any) as any)
            .insert({
                ...candidate,
                created_by: user.id,
                status: 'pending'
            })
            .select()
            .single()

        if (error) throw error
        return data as CandidateActivity
    },

    async updateCandidate(id: string, updates: Partial<CandidateActivity>) {
        const { error } = await (supabase
            .from('candidate_activities' as any) as any)
            .update(updates)
            .eq('id', id)

        if (error) throw error
    },

    async toggleLike(candidateId: string) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // Check if already liked
        const { data: existingLike } = await (supabase
            .from('candidate_likes' as any) as any)
            .select('id')
            .eq('candidate_id', candidateId)
            .eq('user_id', user.id)
            .single()

        if (existingLike) {
            const { error } = await (supabase
                .from('candidate_likes' as any) as any)
                .delete()
                .eq('candidate_id', candidateId)
                .eq('user_id', user.id)
            if (error) throw error
            return false // Unliked
        } else {
            const { error } = await (supabase
                .from('candidate_likes' as any) as any)
                .insert({
                    candidate_id: candidateId,
                    user_id: user.id
                })
            if (error) throw error
            return true // Liked
        }
    },

    async deleteCandidate(id: string) {
        const { error } = await supabase
            .from('candidate_activities')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}
