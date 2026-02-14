<template>
  <div class="group bg-white dark:bg-secondary-800/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-primary-200 dark:hover:border-primary-500/50 hover:shadow-md transition-all duration-300 flex items-center gap-4 relative overflow-hidden">
    <!-- Category Icon -->
    <div 
      class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-sm"
      :class="categoryColor"
    >
      <component :is="categoryIcon" class="w-6 h-6" />
    </div>

    <!-- Details -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between mb-0.5">
        <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ expense.name }}</h4>
        <div class="text-right flex flex-col">
          <span class="text-sm font-black text-slate-900 dark:text-white font-mono">
            {{ getSymbol(expense.currency) }}{{ formatAmount(expense.amount) }}
          </span>
          <span v-if="expense.currency !== preferredCurrency" class="text-[10px] font-black text-primary-600 dark:text-primary-500">
            ≈ {{ preferredCurrency }} {{ formatAmount(convertedAmount) }}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
          {{ expense.category }}
        </span>
        <span class="w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10"></span>
        <span class="text-[10px] text-slate-400 dark:text-white/40 font-medium">
          {{ formatDate(expense.created_at) }}
        </span>
      </div>
      
      <!-- Split Info -->
      <div class="mt-2 flex items-center gap-2">
        <div class="flex -space-x-1.5 overflow-hidden">
           <img 
             v-if="expense.paid_by_profile?.avatar_url"
             :src="expense.paid_by_profile.avatar_url" 
             class="inline-block h-4 w-4 rounded-full ring-2 ring-white dark:ring-secondary-800"
             :title="`由 ${expense.paid_by_profile.display_name} 支付`"
           />
           <div v-else class="h-4 w-4 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center ring-2 ring-white dark:ring-secondary-800">
             <UserIcon class="w-2.5 h-2.5 text-slate-400" />
           </div>
        </div>
        <span class="text-[10px] font-bold" :class="expense.expense_type === 'shared' ? 'text-amber-600 dark:text-amber-400' : 'text-primary-600 dark:text-primary-400'">
          {{ expense.expense_type === 'shared' ? '多人分帳' : '個人支出' }}
        </span>
      </div>
    </div>

    <!-- Actions (Hover) -->
    <div class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
      <button 
        @click.stop="$emit('delete', expense.id)"
        class="p-1.5 hover:bg-red-50 text-secondary-300 hover:text-red-500 rounded-lg transition-colors"
      >
        <TrashIcon class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { 
  ShoppingBagIcon, 
  TicketIcon, 
  CakeIcon, 
  MapIcon, 
  TruckIcon, 
  HomeIcon,
  EllipsisHorizontalCircleIcon,
  UserIcon,
  TrashIcon,
  CircleStackIcon
} from '@heroicons/vue/24/outline';
import { useExpenseStore } from '@/stores/expense';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  expense: any
}>();

defineEmits<{
  (e: 'delete', id: string): void
}>();

const expenseStore = useExpenseStore();
const { preferredCurrency } = storeToRefs(expenseStore);

const convertedAmount = computed(() => {
  return expenseStore.getConvertedAmount(props.expense.amount, props.expense.currency);
});

const categoryIcon = computed(() => {
  switch (props.expense.category) {
    case '餐飲': return CakeIcon;
    case '交通': return TruckIcon;
    case '住宿': return HomeIcon;
    case '購物': return ShoppingBagIcon;
    case '門票': return TicketIcon;
    case '娛樂': return MapIcon;
    case '保險': return CircleStackIcon;
    default: return EllipsisHorizontalCircleIcon;
  }
});

const categoryColor = computed(() => {
  switch (props.expense.category) {
    case '餐飲': return 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400';
    case '交通': return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case '住宿': return 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400';
    case '購物': return 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400';
    case '門票': return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case '娛樂': return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case '保險': return 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400';
    default: return 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white/40';
  }
});

const formatAmount = (val: number) => {
  return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(val);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getSymbol = (code: string) => {
  const symbols: Record<string, string> = {
    'TWD': 'NT$', 'JPY': '¥', 'USD': '$', 'EUR': '€', 'KRW': '₩', 
    'CNY': '¥', 'HKD': 'HK$', 'THB': '฿', 'SGD': 'S$', 'GBP': '£'
  };
  return symbols[code] || '$';
};
</script>
