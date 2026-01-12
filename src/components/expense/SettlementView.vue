<template>
  <div class="space-y-10 animate-fade-in pb-10">
    <!-- Settlement Tab Switcher -->
    <div class="flex justify-center">
      <div class="inline-flex bg-secondary-100 p-1 rounded-2xl">
        <button 
          @click="internalMode = 'overview'"
          class="px-6 py-2.5 rounded-xl font-black text-sm transition-all"
          :class="internalMode === 'overview' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-400 hover:text-secondary-600'"
        >
          全體結算
        </button>
        <button 
          @click="internalMode = 'mine'"
          class="px-6 py-2.5 rounded-xl font-black text-sm transition-all"
          :class="internalMode === 'mine' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-400 hover:text-secondary-600'"
        >
          與我相關
        </button>
      </div>
    </div>

    <!-- MODE: OVERVIEW -->
    <div v-if="internalMode === 'overview'" class="space-y-6">
      <div class="flex items-center justify-between px-2">
        <h3 class="text-xl font-black text-secondary-900">結算清單</h3>
        <span class="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{{ allUnpaidPayments.length }} 筆未結清</span>
      </div>

      <div v-if="allUnpaidPayments.length > 0" class="grid gap-4">
        <div 
          v-for="payment in allUnpaidPayments" 
          :key="payment.id"
          class="bg-white p-5 rounded-[2rem] border-2 border-secondary-50 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        >
          <div class="flex items-center gap-5">
            <!-- Avatars with Flow Indicator -->
            <div class="flex items-center">
              <div class="relative">
                <img :src="payment.payer_profile?.avatar_url || 'https://via.placeholder.com/40'" class="w-10 h-10 rounded-full border-2 border-white ring-2 ring-secondary-50 shadow-sm" />
                <div class="absolute -top-1 -left-1 w-4 h-4 bg-red-100 rounded-full flex items-center justify-center border border-red-200">
                  <ArrowUpRightIcon class="w-2 h-2 text-red-600" />
                </div>
              </div>
              <div class="px-3 flex flex-col items-center">
                <div class="h-0.5 w-6 bg-secondary-100 rounded-full mb-1"></div>
                <div class="h-0.5 w-4 bg-secondary-100 rounded-full opacity-50"></div>
              </div>
              <div class="relative">
                <img :src="payment.expense?.paid_by_profile?.avatar_url || 'https://via.placeholder.com/40'" class="w-10 h-10 rounded-full border-2 border-white ring-2 ring-secondary-50 shadow-sm" />
                <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200">
                  <ArrowDownLeftIcon class="w-2 h-2 text-emerald-600" />
                </div>
              </div>
            </div>

            <div>
              <p class="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">{{ payment.expense?.name }}</p>
              <p class="text-sm font-bold text-secondary-900">
                <span class="text-secondary-500">{{ payment.payer_profile?.display_name }}</span>
                應支付給
                <span class="text-secondary-900">{{ payment.expense?.paid_by_profile?.display_name }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-4 sm:pt-0 border-secondary-50">
            <div class="text-right">
              <div class="flex items-center gap-1 justify-end mb-0.5">
                <span class="text-[10px] font-black text-secondary-400">{{ payment.expense?.currency }}</span>
                <p class="text-xl font-black text-secondary-900 font-mono">{{ formatNum(payment.amount) }}</p>
              </div>
              <p class="text-[10px] font-bold text-primary-500">≈ {{ formatConverted(payment.amount, payment.expense?.currency) }}</p>
            </div>

            <div class="flex flex-col gap-2 min-w-[120px]">
              <!-- Status Badge -->
              <div 
                class="px-3 py-1.5 rounded-xl text-[10px] font-black text-center uppercase tracking-widest border"
                :class="getStatusStyle(payment.status).badge"
              >
                {{ getStatusStyle(payment.status).label }}
              </div>
              
              <!-- Action Button (only for pending confirmation by recipient) -->
              <button 
                v-if="payment.status === 'pending' && authStore.user?.id === payment.expense?.paid_by"
                @click="confirmSettled(payment)"
                class="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
              >
                確認收款
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="py-24 text-center bg-secondary-50 rounded-[3rem] border-4 border-dashed border-secondary-100">
        <div class="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckBadgeIcon class="w-10 h-10 text-emerald-500" />
        </div>
        <p class="text-xl font-black text-secondary-900">所有帳務已結清！</p>
        <p class="text-sm font-bold text-secondary-400 mt-2 italic">旅途愉快，帳目清晰。</p>
      </div>
    </div>

    <!-- MODE: MINE -->
    <div v-else class="grid md:grid-cols-2 gap-8 items-start">
      <!-- Subsection: Need to Pay (Debts) -->
      <div class="space-y-6">
        <div class="flex items-center gap-3 px-2">
          <div class="w-2 h-8 bg-red-500 rounded-full"></div>
          <h3 class="text-xl font-black text-secondary-900">我需要支付</h3>
          <span class="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-full">{{ myDebts.length }}</span>
        </div>

        <div v-if="myDebts.length > 0" class="grid gap-4">
          <div 
            v-for="debt in myDebts" 
            :key="debt.id"
            class="bg-red-50/30 p-5 rounded-[2rem] border-2 border-red-100 hover:bg-red-50 transition-all relative overflow-hidden group"
          >
            <div class="relative z-10 flex justify-between items-start mb-6">
              <div class="flex items-center gap-3">
                <img :src="debt.expense?.paid_by_profile?.avatar_url || 'https://via.placeholder.com/40'" class="w-11 h-11 rounded-full border-2 border-white shadow-sm" />
                <div>
                  <p class="text-[10px] font-black text-red-400 uppercase tracking-widest">{{ debt.expense?.name }}</p>
                  <p class="text-sm font-bold text-secondary-900">給 {{ debt.expense?.paid_by_profile?.display_name }}</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-black text-red-500">{{ debt.expense?.currency }}</span>
                <p class="text-2xl font-black text-secondary-900 font-mono">{{ formatNum(debt.amount) }}</p>
              </div>
            </div>

            <div class="flex gap-2">
              <button 
                v-if="debt.status === 'unpaid'"
                @click="markAsPaid(debt)"
                class="flex-1 py-3 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-700 transition-all shadow-xl shadow-red-200 active:scale-95"
              >
                我已支付
              </button>
              <div v-else class="flex-1 py-3 bg-secondary-900/5 text-secondary-400 text-xs font-black rounded-xl text-center border border-secondary-100">
                等待對方確認中...
              </div>
            </div>
            
            <!-- Warning Tint -->
            <div class="absolute inset-0 bg-red-500 opacity-[0.02] pointer-events-none"></div>
          </div>
        </div>
        <div v-else class="py-12 text-center bg-secondary-50/50 rounded-[2rem] border border-dashed border-secondary-100 italic">
          <p class="text-xs font-bold text-secondary-400">目前沒有欠款</p>
        </div>
      </div>

      <!-- Subsection: Should Receive (Credits) -->
      <div class="space-y-6">
        <div class="flex items-center gap-3 px-2">
          <div class="w-2 h-8 bg-emerald-500 rounded-full"></div>
          <h3 class="text-xl font-black text-secondary-900">我應該收到</h3>
          <span class="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-black rounded-full">{{ myCredits.length }}</span>
        </div>

        <div v-if="myCredits.length > 0" class="grid gap-4">
          <div 
            v-for="credit in myCredits" 
            :key="credit.id"
            class="bg-emerald-50/30 p-5 rounded-[2rem] border-2 border-emerald-100 hover:bg-emerald-50 transition-all relative overflow-hidden group"
          >
            <div class="relative z-10 flex justify-between items-start mb-6">
              <div class="flex items-center gap-3">
                <img :src="credit.payer_profile?.avatar_url || 'https://via.placeholder.com/40'" class="w-11 h-11 rounded-full border-2 border-white shadow-sm" />
                <div>
                  <p class="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{{ credit.expense?.name }}</p>
                  <p class="text-sm font-bold text-secondary-900">來自 {{ credit.payer_profile?.display_name }}</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-black text-emerald-500">{{ credit.expense?.currency }}</span>
                <p class="text-2xl font-black text-secondary-900 font-mono">{{ formatNum(credit.amount) }}</p>
              </div>
            </div>

            <div class="flex gap-2">
              <button 
                v-if="credit.status === 'pending'"
                @click="confirmSettled(credit)"
                class="flex-1 py-3 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 active:scale-95"
              >
                確認收帳
              </button>
              <div v-else class="flex-1 py-3 bg-emerald-900/5 text-emerald-400 text-xs font-black rounded-xl text-center border border-emerald-100">
                尚未支付
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-12 text-center bg-secondary-50/50 rounded-[2rem] border border-dashed border-secondary-100 italic">
          <p class="text-xs font-bold text-secondary-400">目前沒有應收帳款</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useExpenseStore } from '@/stores/expense';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import { 
  CheckBadgeIcon, 
  ArrowUpRightIcon, 
  ArrowDownLeftIcon
} from '@heroicons/vue/24/solid';
import { useDialog } from '@/composables/useDialog';
import { useToast } from '@/composables/useToast';

const expenseStore = useExpenseStore();
const authStore = useAuthStore();
const { expenses, preferredCurrency } = storeToRefs(expenseStore);
const { openConfirmDialog } = useDialog();
const { showToast } = useToast();

const internalMode = ref<'overview' | 'mine'>('mine');

const statusStyles = {
  unpaid: { label: '未支付', badge: 'bg-secondary-50 text-secondary-500 border-secondary-100' },
  pending: { label: '待確認', badge: 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' },
  settled: { label: '已結清', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
} as const;

type PaymentStatus = keyof typeof statusStyles;

const getStatusStyle = (status: any) => {
  const s = (status || 'unpaid') as PaymentStatus;
  return statusStyles[s] || statusStyles.unpaid;
};

// Flatten all shared unpaid/pending payments
const allUnpaidPayments = computed(() => {
  const result: any[] = [];
  expenses.value.forEach(exp => {
    if (exp.expense_type === 'shared') {
      exp.payments?.forEach((p: any) => {
        // Exclude self-payments (payer partaking in their own expense)
        if (p.payer_id !== exp.paid_by && p.status !== 'settled') {
          result.push({
            ...p,
            expense: exp
          });
        }
      });
    }
  });
  return result;
});

const myDebts = computed(() => {
  if (!authStore.user) return [];
  return allUnpaidPayments.value.filter(p => p.payer_id === authStore.user?.id);
});

const myCredits = computed(() => {
  if (!authStore.user) return [];
  return allUnpaidPayments.value.filter(p => p.expense?.paid_by === authStore.user?.id);
});

function formatNum(val: number) {
  return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 0 }).format(val);
}

function formatConverted(amount: number, from: string) {
  const converted = expenseStore.getConvertedAmount(amount, from);
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: preferredCurrency.value }).format(converted);
}

async function markAsPaid(payment: any) {
  const confirmed = await openConfirmDialog(
    '確認支付',
    `確認您已支付 ${payment.expense?.currency}${formatNum(payment.amount)} 給 ${payment.expense?.paid_by_profile?.display_name} 嗎？`,
    'info',
    '已支付',
    '取消'
  );

  if (confirmed) {
    try {
      await expenseStore.updatePaymentStatus(payment.id, 'pending');
      showToast('已送出支付確認，等待對方收款', 'success');
    } catch (e) {
      showToast('更新失敗', 'error');
    }
  }
}

async function confirmSettled(payment: any) {
  const confirmed = await openConfirmDialog(
    '確認收款',
    `確認已收到來自 ${payment.payer_profile?.display_name} 的 ${payment.expense?.currency}${formatNum(payment.amount)} 嗎？`,
    'success',
    '確認收款',
    '取消'
  );

  if (confirmed) {
    try {
      await expenseStore.updatePaymentStatus(payment.id, 'settled');
      showToast('結算成功', 'success');
    } catch (e) {
      showToast('確認失敗', 'error');
    }
  }
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
