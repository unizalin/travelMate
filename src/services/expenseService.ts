import { supabase } from '@/services/supabase'
import type { Database } from '@/types/database'

type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

export const expenseService = {
    async getExpensesByTrip(tripId: string) {
        const { data, error } = await supabase
            .from('expenses')
            .select(`
                *,
                paid_by_profile:profiles!expenses_paid_by_fkey(display_name, avatar_url),
                payments:expense_payments(
                    *,
                    payer_profile:profiles!expense_payments_payer_id_fkey(display_name, avatar_url)
                )
            `)
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async createExpense(expense: ExpenseInsert, payments: any[]) {
        // 1. Create the expense
        const { data: newExpense, error: expenseError } = await supabase
            .from('expenses')
            .insert(expense as any)
            .select()
            .single()

        if (expenseError) throw expenseError

        // 2. Create the payments if shared
        if (expense.expense_type === 'shared' && payments.length > 0) {
            const paymentInserts = payments.map(p => ({
                ...p,
                expense_id: (newExpense as any).id
            }))

            const { error: paymentError } = await supabase
                .from('expense_payments')
                .insert(paymentInserts as any)

            if (paymentError) throw paymentError
        }

        return newExpense as any
    },

    async updateExpense(id: string, updates: ExpenseUpdate) {
        const { data, error } = await supabase
            .from('expenses')
            // @ts-ignore - Supabase type inference issue with 'never' on update
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteExpense(id: string) {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}
