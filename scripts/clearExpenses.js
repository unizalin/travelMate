
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearExpenses() {
    console.log('Starting to clear expenses...')

    // Delete payments first due to foreign key constraints usually, but let's check
    // The service implementation suggests `expense_payments` link to `expenses`

    const { error: paymentError } = await supabase
        .from('expense_payments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all not equal to a dummy UUID

    if (paymentError) {
        console.error('Error deleting payments:', paymentError)
        return
    }
    console.log('Cleared expense_payments table')

    const { error: expenseError } = await supabase
        .from('expenses')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

    if (expenseError) {
        console.error('Error deleting expenses:', expenseError)
        return
    }
    console.log('Cleared expenses table')

    console.log('Done!')
}

clearExpenses()
