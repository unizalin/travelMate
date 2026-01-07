export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          name: string
          destination: string
          start_date: string
          end_date: string
          created_by: string
          invite_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          destination: string
          start_date: string
          end_date: string
          created_by: string
          invite_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          destination?: string
          start_date?: string
          end_date?: string
          created_by?: string
          invite_code?: string | null
          created_at?: string
        }
      }
      trip_members: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          role: 'organizer' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id: string
          role: 'organizer' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          user_id?: string
          role?: 'organizer' | 'member'
          joined_at?: string
        }
      }
      itineraries: {
        Row: {
          id: string
          trip_id: string
          day_number: number
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          day_number: number
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          day_number?: number
          date?: string
          created_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          itinerary_id: string
          name: string
          location: string | null
          start_time: string | null
          end_time: string | null
          order_index: number
          duration: number | null
          notes: string | null
          image_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          itinerary_id: string
          name: string
          location?: string | null
          start_time?: string | null
          end_time?: string | null
          order_index: number
          duration?: number | null
          notes?: string | null
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          itinerary_id?: string
          name?: string
          location?: string | null
          start_time?: string | null
          end_time?: string | null
          order_index?: number
          duration?: number | null
          notes?: string | null
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          trip_id: string
          name: string
          amount: number
          currency: string
          category: string
          expense_type: 'shared' | 'personal'
          paid_by: string
          receipt_url: string | null
          split_members: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          name: string
          amount: number
          currency?: string
          category: string
          expense_type: 'shared' | 'personal'
          paid_by: string
          receipt_url?: string | null
          split_members?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          name?: string
          amount?: number
          currency?: string
          category?: string
          expense_type?: 'shared' | 'personal'
          paid_by?: string
          receipt_url?: string | null
          split_members?: Json
          created_at?: string
          updated_at?: string
        }
      }
      expense_payments: {
        Row: {
          id: string
          expense_id: string
          payer_id: string
          amount: number
          is_paid: boolean | null
          paid_at: string | null
        }
        Insert: {
          id?: string
          expense_id: string
          payer_id: string
          amount: number
          is_paid?: boolean | null
          paid_at?: string | null
        }
        Update: {
          id?: string
          expense_id?: string
          payer_id?: string
          amount?: number
          is_paid?: boolean | null
          paid_at?: string | null
        }
      }
    }
  }
}
