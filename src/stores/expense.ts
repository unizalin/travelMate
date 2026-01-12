import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { expenseService } from '@/services/expenseService'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/services/supabase'
import { currencyService } from '@/services/currencyService'

export const useExpenseStore = defineStore('expense', () => {
    const expenses = ref<any[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const authStore = useAuthStore()

    // New States
    const filterMode = ref<'all' | 'mine'>('all')
    const viewMode = ref<'list' | 'settlement'>('list')
    const preferredCurrency = ref('TWD') // Default to TWD for conversion display
    const exchangeRatesCache = ref<Record<string, any>>({})

    const fetchExpenses = async (tripId: string) => {
        try {
            loading.value = true
            error.value = null
            expenses.value = await expenseService.getExpensesByTrip(tripId)

            // Pre-fetch rates for all involved currencies to the preferred currency
            const involvedCurrencies = [...new Set(expenses.value.map(e => e.currency))]
            for (const cur of involvedCurrencies) {
                if (!exchangeRatesCache.value[cur]) {
                    exchangeRatesCache.value[cur] = await currencyService.getExchangeRates(cur)
                }
            }
        } catch (e: any) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    const addExpense = async (expense: any, payments: any[]) => {
        try {
            loading.value = true
            const newExpense = await expenseService.createExpense(expense, payments)
            // Refetch to get populated profiles and payments
            await fetchExpenses(expense.trip_id)
            return newExpense
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    const deleteExpense = async (id: string) => {
        try {
            await expenseService.deleteExpense(id)
            expenses.value = expenses.value.filter(e => e.id !== id)
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    /**
     * Updated Payment Status Logic
     * unpaid -> pending -> settled
     */
    const updatePaymentStatus = async (paymentId: string, status: 'unpaid' | 'pending' | 'settled') => {
        try {
            const { error: e } = await (supabase
                .from('expense_payments') as any)
                .update({
                    status: status,
                    is_paid: status === 'settled',
                    paid_at: status === 'settled' ? new Date().toISOString() : null
                })
                .eq('id', paymentId)

            if (e) throw e

            // Update local state
            expenses.value.forEach(exp => {
                const p = exp.payments?.find((pay: any) => pay.id === paymentId)
                if (p) {
                    p.status = status
                    p.is_paid = status === 'settled'
                    p.paid_at = status === 'settled' ? new Date().toISOString() : null
                }
            })
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    // --- Conversion Helper ---
    const getConvertedAmount = (amount: number, from: string) => {
        if (from === preferredCurrency.value) return amount
        const rates = exchangeRatesCache.value[from]?.rates
        if (!rates || !rates[preferredCurrency.value]) return 0
        return amount * rates[preferredCurrency.value]
    }

    // --- Statistics (Converted to Preferred Currency) ---
    const filteredExpenses = computed(() => {
        if (filterMode.value === 'all') return expenses.value
        if (!authStore.user) return []
        return expenses.value.filter(e => e.paid_by === authStore.user?.id)
    })

    const totalAmount = computed(() => {
        return expenses.value.reduce((sum, e) => sum + getConvertedAmount(e.amount, e.currency), 0)
    })

    const userPaidAmount = computed(() => {
        if (!authStore.user) return 0
        return expenses.value
            .filter(e => e.paid_by === authStore.user?.id)
            .reduce((sum, e) => sum + getConvertedAmount(e.amount, e.currency), 0)
    })

    const userOwedAmount = computed(() => {
        if (!authStore.user) return 0
        let total = 0
        expenses.value.forEach(e => {
            if (e.expense_type === 'shared') {
                const userPayment = e.payments?.find((p: any) => p.payer_id === authStore.user?.id && p.status !== 'settled')
                if (userPayment && e.paid_by !== authStore.user?.id) {
                    total += getConvertedAmount(userPayment.amount, e.currency)
                }
            }
        });
        return total
    })

    const lentAmount = computed(() => {
        if (!authStore.user) return 0
        let total = 0
        expenses.value.forEach(e => {
            if (e.paid_by === authStore.user?.id && e.expense_type === 'shared') {
                const othersPayments = e.payments?.filter((p: any) => p.payer_id !== authStore.user?.id && p.status !== 'settled') || []
                othersPayments.forEach((p: any) => total += getConvertedAmount(p.amount, e.currency))
            }
        })
        return total
    })

    // New: The actual total amount the user is responsible for (their "share" of the trip)
    const userActualCost = computed(() => {
        if (!authStore.user) return 0
        let total = 0
        expenses.value.forEach(e => {
            if (e.expense_type === 'personal' && e.paid_by === authStore.user?.id) {
                total += getConvertedAmount(e.amount, e.currency)
            } else if (e.expense_type === 'shared') {
                const userPayment = e.payments?.find((p: any) => p.payer_id === authStore.user?.id)
                if (userPayment) {
                    total += getConvertedAmount(userPayment.amount, e.currency)
                }
            }
        })
        return total
    })

    // Settlement Logic: Who owes whom
    const settlements = computed(() => {
        const balances: Record<string, any[]> = {} // userId -> list of debts
        // This is complex, will be handled in SettlementView.vue more directly from payments
        return balances
    })

    return {
        expenses,
        loading,
        error,
        filterMode,
        viewMode,
        preferredCurrency,
        fetchExpenses,
        addExpense,
        deleteExpense,
        updatePaymentStatus,
        getConvertedAmount,
        filteredExpenses,
        totalAmount,
        userPaidAmount,
        userOwedAmount,
        lentAmount,
        userActualCost,
        settlements
    }
})
