import { supabase } from '@/services/supabase'
import type { ActivitySuggestion } from './geminiService'

export interface AISuggestionRecord {
    id?: string
    trip_id: string
    user_id: string
    day_number: number
    user_message: string
    ai_response: string
    suggested_activities: ActivitySuggestion[]
    created_at?: string
}

export const aiSuggestionService = {
    async saveSuggestion(record: AISuggestionRecord) {
        const { data, error } = await (supabase.from('ai_suggestions') as any)
            .insert({
                trip_id: record.trip_id,
                user_id: record.user_id,
                day_number: record.day_number,
                user_message: record.user_message,
                ai_response: record.ai_response,
                suggested_activities: record.suggested_activities
            })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async getSuggestionsByDay(tripId: string, dayNumber: number) {
        const { data, error } = await (supabase.from('ai_suggestions') as any)
            .select('*')
            .eq('trip_id', tripId)
            .eq('day_number', dayNumber)
            .order('created_at', { ascending: true })

        if (error) throw error
        return data as any[]
    }
}
