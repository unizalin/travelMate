<template>
  <div class="space-y-8 animate-fade-in pb-20">
    <!-- Summary Cards Grid (4-Color Dashboard Style) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div 
        v-for="stat in summaryStats" 
        :key="stat.label"
        @click="toggleStat(stat.label)"
        class="bg-white dark:bg-secondary-800/50 p-5 rounded-3xl border-2 dark:border-white/5 shadow-sm transition-all group relative overflow-hidden cursor-pointer active:scale-95"
        :class="stat.borderColor"
      >
        <div class="relative z-10">
          <div class="flex justify-between items-start mb-2 text-secondary-400">
            <p class="text-[10px] font-black uppercase tracking-widest">{{ stat.label }}</p>
            <ChevronDownIcon 
              class="w-3 h-3 transition-transform" 
              :class="expandedStat === stat.label ? 'rotate-180' : ''" 
            />
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-xs font-bold text-secondary-400 dark:text-white/40">{{ preferredCurrency }}</span>
            <span class="text-2xl font-black text-secondary-900 dark:text-white font-mono">{{ formatAmount(stat.value) }}</span>
          </div>
          
          <!-- Expandable Detail -->
          <transition 
            enter-active-class="transition duration-100 ease-out" 
            enter-from-class="transform scale-95 opacity-0" 
            enter-to-class="transform scale-100 opacity-100" 
            leave-active-class="transition duration-75 ease-in" 
            leave-from-class="transform scale-100 opacity-100" 
            leave-to-class="transform scale-95 opacity-0"
          >
            <div v-if="expandedStat === stat.label" class="mt-4 pt-4 border-t border-secondary-50 space-y-2">
               <div v-for="(val, cur) in stat.breakdown" :key="cur" class="flex justify-between text-[10px] font-bold">
                 <span class="text-secondary-400 dark:text-white/40 uppercase">{{ cur }}</span>
                 <span class="text-secondary-700 dark:text-white/80 font-mono">{{ formatNumSimple(val) }}</span>
               </div>
            </div>
          </transition>
        </div>
        <!-- Background Tint -->
        <div class="absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.06]" :class="stat.bgColor"></div>
      </div>
    </div>

    <!-- Toolbar: Filter & Toggles -->
    <div class="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/80 dark:bg-white/5 p-2 rounded-2xl border-2 border-secondary-50 dark:border-white/5 shadow-sm sticky top-4 z-20 backdrop-blur-md">
      <div class="flex items-center gap-4 w-full sm:w-auto">
        <div class="flex bg-secondary-50 p-1 rounded-xl">
           <button 
             @click="viewMode = 'list'"
             class="px-4 py-1.5 rounded-lg text-xs font-black transition-all"
             :class="viewMode === 'list' ? 'bg-white dark:bg-white/10 text-secondary-900 dark:text-white shadow-sm' : 'text-secondary-400 dark:text-white/40 hover:text-secondary-600 dark:hover:text-white/60'"
           >
             支出明細
           </button>
           <button 
             @click="viewMode = 'settlement'"
             class="px-4 py-1.5 rounded-lg text-xs font-black transition-all"
             :class="viewMode === 'settlement' ? 'bg-white dark:bg-white/10 text-secondary-900 dark:text-white shadow-sm' : 'text-secondary-400 dark:text-white/40 hover:text-secondary-600 dark:hover:text-white/60'"
           >
             結算總覽
           </button>
        </div>
        <div v-if="viewMode === 'list'" class="h-6 w-px bg-secondary-100 dark:bg-white/10 hidden sm:block"></div>
        <ExpenseFilter v-if="viewMode === 'list'" />
      </div>

      <button 
        @click="isModalOpen = true"
        class="w-full sm:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-200 dark:shadow-none font-black transition-all flex items-center justify-center gap-2 transform active:scale-95"
      >
        <PlusIcon class="w-4 h-4" />
        添加支出
      </button>
    </div>

    <!-- Main Content Area -->
    <div class="grid lg:grid-cols-3 gap-8 items-start">
      <!-- Sidebar: Category Chart (Only in list mode) -->
      <div v-if="viewMode === 'list'" class="lg:col-span-1 bg-slate-900 dark:bg-secondary-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 dark:shadow-none">
        <h3 class="text-lg font-black mb-8 flex items-center gap-3">
          <ChartBarIcon class="w-6 h-6 text-primary-400" />
          支出分類
        </h3>
        
        <div class="space-y-8">
          <div v-for="cat in categoryStats" :key="cat.name" class="space-y-3">
            <div class="flex justify-between items-baseline">
              <span class="text-[10px] font-black uppercase tracking-widest text-secondary-400">{{ cat.name }}</span>
              <span class="text-sm font-black font-mono">{{ preferredCurrency }} {{ formatAmount(cat.amount) }}</span>
            </div>
            <div class="h-2 bg-white/10 rounded-full overflow-hidden">
               <div 
                 class="h-full bg-primary-500 rounded-full transition-all duration-1000" 
                 :style="{ width: `${cat.percent}%` }"
               ></div>
            </div>
          </div>
        </div>

        <div v-if="categoryStats.length === 0" class="py-12 text-center text-secondary-500 italic text-sm font-bold">
           尚未有支出數據
        </div>
        
        <!-- Manual Refresh Currency Button -->
        <button 
          @click="refreshRates"
          class="w-full mt-10 py-3 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2"
        >
          <ArrowPathIcon class="w-3 h-3" :class="loading ? 'animate-spin' : ''" />
          更新即時匯率
        </button>
      </div>

      <!-- Content: List or Settlement -->
      <div :class="viewMode === 'list' ? 'lg:col-span-2' : 'lg:col-span-3'" class="space-y-6">
        <!-- MODE: Expense List -->
        <template v-if="viewMode === 'list'">
          <div class="flex items-center justify-between mb-4 px-2">
            <h3 class="text-xl font-black text-slate-900 dark:text-white">
              {{ filterMode === 'mine' ? '我的支出' : '支出明細' }}
            </h3>
            <span class="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">{{ filteredExpenses.length }} 筆記錄</span>
          </div>

          <div class="space-y-10">
            <div v-for="(group, date) in groupedExpenses" :key="date" class="space-y-4">
               <div class="bg-slate-100 dark:bg-white/5 px-4 py-1.5 rounded-full inline-block">
                 <h4 class="text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{{ date }}</h4>
               </div>
               <div class="grid gap-4">
                 <ExpenseItem 
                   v-for="expense in group" 
                   :key="expense.id" 
                   :expense="expense" 
                   @delete="handleDelete"
                 />
               </div>
            </div>

            <div v-if="filteredExpenses.length === 0" class="py-24 text-center bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border-4 border-dashed border-slate-100 dark:border-white/5">
               <div class="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                 <ShoppingBagIcon class="w-8 h-8 text-slate-300 dark:text-white/20" />
               </div>
               <p class="text-lg font-black text-slate-900 dark:text-white">目前沒有相關支出</p>
               <p class="text-sm font-bold text-slate-400 dark:text-white/40 mt-2 italic">開始記帳來追蹤旅程預算吧！</p>
            </div>
          </div>
        </template>

        <!-- MODE: Settlement -->
        <template v-else>
           <SettlementView />
        </template>
      </div>
    </div>

    <!-- Expense Dialog -->
    <UIDialog :show="isModalOpen" @close="isModalOpen = false" title="添加支出" max-width="lg">
      <ExpenseForm 
        :trip-id="tripId"
        :members="members"
        @success="handleSuccess"
        @cancel="isModalOpen = false"
      />
    </UIDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { 
  PlusIcon, 
  ChartBarIcon, 
  ShoppingBagIcon,
  ChevronDownIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/solid';
import ExpenseItem from './ExpenseItem.vue';
import ExpenseForm from '../expense/ExpenseForm.vue';
import ExpenseFilter from '../expense/ExpenseFilter.vue';
import SettlementView from '../expense/SettlementView.vue';
import UIDialog from '@/components/ui/Dialog.vue';
import { useExpenseStore } from '@/stores/expense';
import { useAuthStore } from '@/stores/auth';
import { currencyService } from '@/services/currencyService';
import { storeToRefs } from 'pinia';
import { useDialog } from '@/composables/useDialog';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  tripId: string
  members: any[]
}>();

const expenseStore = useExpenseStore();
const authStore = useAuthStore();
const { openDeleteDialog } = useDialog();
const { showToast } = useToast();
const { 
  filteredExpenses, 
  totalAmount, 
  userOwedAmount, 
  lentAmount,
  userActualCost,
  filterMode,
  viewMode,
  preferredCurrency,
  loading,
  expenses
} = storeToRefs(expenseStore);

const isModalOpen = ref(false);
const expandedStat = ref<string | null>(null);

const summaryStats = computed(() => [
  { 
    label: '總體支出', 
    value: totalAmount.value, 
    bgColor: 'bg-primary-500', 
    borderColor: 'border-primary-50',
    breakdown: calculateBreakdown(expenses.value)
  },
  { 
    label: '我的負擔', 
    value: userActualCost.value, 
    bgColor: 'bg-purple-500', 
    borderColor: 'border-purple-50',
    breakdown: calculateUserActualBreakdown()
  },
  { 
    label: '我需支付', 
    value: userOwedAmount.value, 
    bgColor: 'bg-red-500', 
    borderColor: 'border-red-50',
    breakdown: calculateDebtBreakdown()
  },
  { 
    label: '預計收回', 
    value: lentAmount.value, 
    bgColor: 'bg-emerald-500', 
    borderColor: 'border-emerald-50',
    breakdown: calculateCreditBreakdown()
  },
]);

function toggleStat(label: string) {
  expandedStat.value = expandedStat.value === label ? null : label;
}

function calculateBreakdown(items: any[]) {
  const breakdown: Record<string, number> = {};
  items.forEach(e => {
    breakdown[e.currency] = (breakdown[e.currency] || 0) + e.amount;
  });
  return breakdown;
}

function calculateUserActualBreakdown() {
  if (!authStore.user) return {};
  const breakdown: Record<string, number> = {};
  expenses.value.forEach(e => {
    if (e.expense_type === 'personal' && e.paid_by === authStore.user?.id) {
       breakdown[e.currency] = (breakdown[e.currency] || 0) + e.amount;
    } else if (e.expense_type === 'shared') {
       const userPayment = e.payments?.find((p: any) => p.payer_id === authStore.user?.id);
       if (userPayment) {
         breakdown[e.currency] = (breakdown[e.currency] || 0) + userPayment.amount;
       }
    }
  });
  return breakdown;
}

function calculateDebtBreakdown() {
  if (!authStore.user) return {};
  const breakdown: Record<string, number> = {};
  expenses.value.forEach(e => {
    if (e.expense_type === 'shared' && e.paid_by !== authStore.user?.id) {
      const userPayment = e.payments?.find((p: any) => p.payer_id === authStore.user?.id && p.status !== 'settled');
      if (userPayment) {
        breakdown[e.currency] = (breakdown[e.currency] || 0) + userPayment.amount;
      }
    }
  });
  return breakdown;
}

function calculateCreditBreakdown() {
  if (!authStore.user) return {};
  const breakdown: Record<string, number> = {};
  expenses.value.forEach(e => {
    if (e.paid_by === authStore.user?.id && e.expense_type === 'shared') {
      const othersPayments = e.payments?.filter((p: any) => p.payer_id !== authStore.user?.id && p.status !== 'settled') || [];
      othersPayments.forEach((p: any) => {
        breakdown[e.currency] = (breakdown[e.currency] || 0) + p.amount;
      });
    }
  });
  return breakdown;
}

const groupedExpenses = computed(() => {
  const groups: Record<string, any[]> = {};
  filteredExpenses.value.forEach(exp => {
    const date = new Date(exp.created_at).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(exp);
  });
  return groups;
});

const categoryStats = computed(() => {
  const counts: Record<string, number> = {};
  filteredExpenses.value.forEach(exp => {
    const converted = expenseStore.getConvertedAmount(exp.amount, exp.currency);
    counts[exp.category] = (counts[exp.category] || 0) + converted;
  });

  const total = Object.values(counts).reduce((sum, val) => sum + val, 0) || 1;
  return Object.entries(counts).map(([name, amount]) => ({
    name,
    amount,
    percent: Math.round((amount / total) * 100)
  })).sort((a, b) => b.amount - a.amount);
});

onMounted(async () => {
  await expenseStore.fetchExpenses(props.tripId);
});

async function refreshRates() {
  currencyService.clearCache();
  await expenseStore.fetchExpenses(props.tripId);
  showToast('匯率已更新過', 'success');
}

function formatAmount(val: number) {
  return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

function formatNumSimple(val: number) {
  return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val);
}

function handleSuccess() {
  isModalOpen.value = false;
  expenseStore.fetchExpenses(props.tripId);
}

async function handleDelete(id: string) {
    const confirmed = await openDeleteDialog('刪除支出', '確定要刪除這筆支出嗎？這項動作無法復原。');
    if (confirmed) {
        try {
            await expenseStore.deleteExpense(id);
            showToast('支出已刪除', 'success');
        } catch (e) {
            showToast('刪除失敗', 'error');
        }
    }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #f1f5f9;
  border-radius: 10px;
}
</style>
