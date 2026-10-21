<template>
  <div class="space-y-8 max-w-lg mx-auto p-1">
    <!-- Amount & Currency Section -->
    <div class="space-y-4">
      <label class="block text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em] px-1 transition-colors">支出金額與幣值</label>
      <div class="space-y-4">
        <div class="flex gap-3">
          <!-- Currency Dropdown -->
          <div class="relative w-36 flex-shrink-0 group">
            <select 
              v-model="form.currency"
              class="w-full appearance-none px-5 py-4.5 bg-gray-50 dark:bg-white/5 border-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white dark:focus:bg-secondary-900 rounded-[1.25rem] text-sm font-black text-gray-900 dark:text-white outline-none transition-all cursor-pointer shadow-sm"
            >
              <option v-for="c in currencies" :key="c.code" :value="c.code">
                {{ c.symbol }} {{ c.code }}
              </option>
            </select>
            <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300 dark:text-white/10 group-hover:text-primary-500 transition-colors">
              <ChevronDownIcon class="w-4 h-4" />
            </div>
          </div>

          <!-- Amount Input -->
          <div class="relative flex-1 group">
            <div class="absolute -inset-0.5 bg-primary-500/20 rounded-[1.5rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            <input 
              v-model.number="form.amount"
              type="number" 
              placeholder="0"
              required
              class="relative w-full px-6 py-4.5 bg-gray-50 dark:bg-white/5 border-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white dark:focus:bg-secondary-900 rounded-[1.5rem] text-3xl font-black text-gray-900 dark:text-white placeholder:text-gray-200 dark:placeholder:text-white/5 transition-all outline-none shadow-sm"
            />
          </div>
        </div>

        <!-- Conversion Preview -->
        <div v-if="form.amount && form.currency !== preferredCurrency" class="flex items-center gap-2.5 px-5 py-3.5 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border border-primary-100/50 dark:border-primary-500/20 animate-fade-in transition-colors">
          <span class="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">約等同於</span>
          <span class="text-base font-black text-primary-700 dark:text-primary-300">{{ formatConvertedAmount }}</span>
          <div class="ml-auto flex items-center gap-1.5 bg-primary-500/10 px-2 py-1 rounded-lg">
            <SparklesIcon class="w-3 h-3 text-primary-600 dark:text-primary-400" />
            <span class="text-[8px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.2em]">即時匯率</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Expense Name Section -->
    <div class="space-y-4">
      <label class="block text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em] px-1 transition-colors">
        支出名稱 <span class="text-[8px] opacity-50 ml-1">(選填)</span>
      </label>
      <div class="relative group">
        <div class="absolute -inset-0.5 bg-primary-500/10 rounded-[1.5rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
        <input 
          v-model="form.name"
          type="text" 
          placeholder="例如：一蘭拉麵、新宿地鐵..."
          class="relative w-full px-6 py-4.5 bg-gray-50 dark:bg-white/5 border-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white dark:focus:bg-secondary-900 rounded-[1.5rem] text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/5 transition-all outline-none shadow-sm"
        />
      </div>
    </div>

    <!-- Category Grid Section -->
    <div class="space-y-4">
      <label class="block text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em] px-1 transition-colors">分類</label>
      <div class="grid grid-cols-4 gap-3">
        <button 
          v-for="cat in categories" 
          :key="cat.name"
          type="button"
          @click="form.category = cat.name"
          class="flex flex-col items-center gap-2 p-3.5 rounded-[1.5rem] border-2 transition-all group/cat relative overflow-hidden"
          :class="form.category === cat.name 
            ? `border-current ${cat.bg} dark:bg-opacity-10 ${cat.text} shadow-xl scale-[1.05] z-10` 
            : 'border-transparent bg-gray-50 dark:bg-white/5 hover:border-gray-100 dark:hover:border-white/10 hover:bg-white dark:hover:bg-secondary-800'"
        >
          <div class="absolute inset-0 bg-white/20 dark:bg-black/20 opacity-0 group-hover/cat:opacity-100 transition-opacity"></div>
          <component 
            :is="cat.icon" 
            class="w-7 h-7 transition-all duration-300 group-hover/cat:scale-110 relative z-10" 
            :class="form.category === cat.name ? cat.text : 'text-gray-400 dark:text-white/20'" 
          />
          <span class="text-[10px] font-black relative z-10 transition-colors" :class="form.category === cat.name ? cat.text : 'text-gray-500 dark:text-white/40'">{{ cat.name }}</span>
        </button>
      </div>
    </div>

    <!-- Split Mode Section -->
    <div class="space-y-6">
      <label class="block text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em] px-1 transition-colors">分帳方式</label>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button 
          v-for="mode in splitModes" 
          :key="mode.value"
          type="button"
          @click="form.splitMode = mode.value"
          class="relative flex flex-col items-center gap-3 p-5 rounded-[2.5rem] border-2 transition-all text-left group/mode overflow-hidden"
          :class="form.splitMode === mode.value 
            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 shadow-2xl shadow-primary-500/20 scale-[1.02]' 
            : 'border-transparent bg-gray-50 dark:bg-white/5 hover:border-gray-100 dark:hover:border-white/10 hover:bg-white dark:hover:bg-secondary-800'"
        >
          <div class="absolute top-0 right-0 w-16 h-16 bg-primary-500/5 rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover/mode:opacity-100 transition-opacity"></div>
          
          <div 
            class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm"
            :class="form.splitMode === mode.value ? 'bg-primary-600 text-white rotate-6' : 'bg-white dark:bg-secondary-800 text-gray-400 dark:text-white/20'"
          >
            <component :is="mode.icon" class="w-6 h-6" />
          </div>
          <div class="text-center relative z-10">
            <p class="text-[11px] font-black uppercase tracking-widest mb-1 transition-colors" :class="form.splitMode === mode.value ? 'text-primary-900 dark:text-white' : 'text-gray-900 dark:text-white/60'">{{ mode.label }}</p>
            <p class="text-[9px] font-bold transition-colors" :class="form.splitMode === mode.value ? 'text-primary-600 dark:text-primary-400/60' : 'text-gray-400 dark:text-white/20'">{{ mode.desc }}</p>
          </div>
          
          <div v-if="form.splitMode === mode.value" class="absolute top-4 right-4 animate-pop-in">
            <CheckCircleIcon class="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
        </button>
      </div>

      <!-- Custom Members Selection List -->
      <div v-if="form.splitMode === 'custom'" class="bg-gray-50 dark:bg-white/5 p-6 rounded-[2.5rem] space-y-4 animate-fade-in-up transition-colors border border-gray-100 dark:border-white/5">
        <div class="flex items-center justify-between px-1">
           <p class="text-[9px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em]">選擇成員 ({{ form.selectedUserIds.length }} 位)</p>
           <div class="flex items-center gap-1 bg-primary-500/10 px-2 py-0.5 rounded-full">
             <span class="text-[8px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">每人</span>
             <span class="text-[10px] font-black text-primary-600 dark:text-primary-400">{{ currentCurrencySymbol }}{{ perPersonAmount }}</span>
           </div>
        </div>
        <div class="grid gap-2.5">
          <button 
            v-for="member in members" 
            :key="member.user_id"
            type="button"
            @click="toggleMember(member.user_id)"
            :disabled="member.user_id === authStore.user?.id"
            class="flex items-center justify-between p-4 rounded-2xl border-2 transition-all relative overflow-hidden group/member"
            :class="[
              form.selectedUserIds.includes(member.user_id) 
                ? 'border-primary-500/50 bg-white dark:bg-secondary-900 shadow-lg shadow-primary-500/5' 
                : 'border-transparent bg-white/50 dark:bg-black/20 opacity-40 grayscale',
              member.user_id === authStore.user?.id ? 'cursor-default' : 'cursor-pointer'
            ]"
          >
            <div class="flex items-center gap-4 relative z-10">
              <div class="relative">
                <img :src="member.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + member.user_id" class="w-10 h-10 rounded-full border-2 border-white dark:border-secondary-800 shadow-sm bg-secondary-100" />
                <div v-if="form.selectedUserIds.includes(member.user_id)" class="absolute -right-1.5 -bottom-1.5 bg-primary-600 text-white rounded-full p-1 ring-4 ring-white dark:ring-secondary-800 shadow-lg animate-pop-in">
                  <CheckIcon class="w-2.5 h-2.5 stroke-[4]" />
                </div>
              </div>
              <div class="flex flex-col items-start">
                <span class="text-sm font-black text-gray-900 dark:text-white transition-colors">
                  {{ member.profiles?.display_name }}
                  <span v-if="member.user_id === authStore.user?.id" class="text-[9px] text-primary-500 dark:text-primary-400 font-black ml-1 uppercase bg-primary-500/10 px-1.5 py-0.5 rounded-md">本人</span>
                </span>
              </div>
            </div>
            <span v-if="form.selectedUserIds.includes(member.user_id)" class="text-xs font-black text-primary-700 dark:text-primary-400 relative z-10">
              {{ currentCurrencySymbol }}{{ perPersonAmount }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-4 pt-6">
      <button 
        @click="$emit('cancel')"
        type="button" 
        class="flex-1 py-4.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-[1.5rem] transition-all active:scale-95"
      >
        取消
      </button>
      <button 
        @click="handleSubmit"
        :disabled="loading || !form.amount"
        type="button" 
        class="flex-[2] py-4.5 bg-primary-600 dark:bg-white text-white dark:text-gray-950 font-black text-[10px] uppercase tracking-[0.2em] rounded-[1.5rem] shadow-2xl shadow-primary-500/20 dark:shadow-white/5 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        <span v-if="loading" class="w-5 h-5 border-3 border-current border-t-transparent rounded-full animate-spin"></span>
        {{ loading ? '處理中...' : '確認添加' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { 
  ShoppingBagIcon, 
  TicketIcon, 
  CakeIcon, 
  MapIcon, 
  TruckIcon, 
  HomeIcon,
  EllipsisHorizontalCircleIcon,
  UserIcon,
  UsersIcon,
  UserGroupIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  CheckIcon,
  CircleStackIcon
} from '@heroicons/vue/24/solid';
import { useExpenseStore } from '@/stores/expense';
import { useAuthStore } from '@/stores/auth';
import { currencyService } from '@/services/currencyService';
import { storeToRefs } from 'pinia';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  tripId: string
  members: any[]
}>();

const emit = defineEmits<{
  (e: 'success'): void
  (e: 'cancel'): void
}>();

const expenseStore = useExpenseStore();
const { preferredCurrency } = storeToRefs(expenseStore);
const authStore = useAuthStore();
const { showToast } = useToast();
const loading = ref(false);

const currencies = [
  { code: 'TWD', symbol: 'NT$' },
  { code: 'JPY', symbol: '¥' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'KRW', symbol: '₩' },
  { code: 'CNY', symbol: '¥' },
  { code: 'HKD', symbol: 'HK$' },
  { code: 'THB', symbol: '฿' },
  { code: 'SGD', symbol: 'S$' },
  { code: 'GBP', symbol: '£' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
];

const categories = [
  { name: '餐飲', icon: CakeIcon, bg: 'bg-orange-50', text: 'text-orange-600' },
  { name: '交通', icon: TruckIcon, bg: 'bg-blue-50', text: 'text-blue-600' },
  { name: '住宿', icon: HomeIcon, bg: 'bg-purple-50', text: 'text-purple-600' },
  { name: '購物', icon: ShoppingBagIcon, bg: 'bg-pink-50', text: 'text-pink-600' },
  { name: '門票', icon: TicketIcon, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { name: '娛樂', icon: MapIcon, bg: 'bg-amber-50', text: 'text-amber-600' },
  { name: '保險', icon: CircleStackIcon, bg: 'bg-cyan-50', text: 'text-cyan-600' },
  { name: '其他', icon: EllipsisHorizontalCircleIcon, bg: 'bg-secondary-50', text: 'text-secondary-600' },
];

const splitModes: { label: string, value: 'personal' | 'everyone' | 'custom', desc: string, icon: any }[] = [
  { label: '個人', value: 'personal', desc: '僅由我支付', icon: UserIcon },
  { label: '全員', value: 'everyone', desc: '所有人平分', icon: UsersIcon },
  { label: '自訂', value: 'custom', desc: '選擇特定成員', icon: UserGroupIcon },
];

const form = reactive({
  name: '',
  amount: null as number | null,
  currency: 'JPY',
  category: '餐飲',
  splitMode: 'everyone' as 'personal' | 'everyone' | 'custom',
  selectedUserIds: [] as string[]
});

const currentCurrencySymbol = computed(() => {
  return currencies.find(c => c.code === form.currency)?.symbol || '$';
});

const formatConvertedAmount = computed(() => {
  if (!form.amount) return '';
  const converted = expenseStore.getConvertedAmount(form.amount, form.currency);
  return currencyService.formatCurrency(converted, preferredCurrency.value);
});

const perPersonAmount = computed(() => {
  if (!form.amount) return '0.00';
  let count = 1;
  if (form.splitMode === 'everyone') count = props.members.length;
  else if (form.splitMode === 'custom') count = form.selectedUserIds.length || 1;
  
  return (form.amount / count).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
});

onMounted(() => {
  // Default selected members to everyone
  form.selectedUserIds = props.members.map(m => m.user_id);
  
  // Ensure current user is selected regardless of props (just in case)
  if (authStore.user && !form.selectedUserIds.includes(authStore.user.id)) {
    form.selectedUserIds.push(authStore.user.id);
  }
});

function toggleMember(userId: string) {
  // Prevent removing the current user (payer usually partakes)
  if (userId === authStore.user?.id) return;

  const index = form.selectedUserIds.indexOf(userId);
  if (index > -1) {
    if (form.selectedUserIds.length > 1) {
      form.selectedUserIds.splice(index, 1);
    }
  } else {
    form.selectedUserIds.push(userId);
  }
}

async function handleSubmit() {
  if (!authStore.user || !form.amount) return;
  
  try {
    loading.value = true;
    
    // Process final list of payers based on mode
    let participantIds: string[] = [];
    if (form.splitMode === 'personal') {
      participantIds = [authStore.user.id];
    } else if (form.splitMode === 'everyone') {
      participantIds = props.members.map(m => m.user_id);
    } else {
      participantIds = form.selectedUserIds;
    }

    const expense = {
      trip_id: props.tripId,
      name: form.name || form.category, // Default to category if name empty
      amount: form.amount,
      currency: form.currency,
      category: form.category,
      expense_type: form.splitMode === 'personal' ? 'personal' : 'shared',
      paid_by: authStore.user.id,
      split_members: participantIds
    };

    const payments: any[] = [];
    if (participantIds.length > 0) {
      const perPerson = form.amount / participantIds.length;
      participantIds.forEach(userId => {
        payments.push({
          payer_id: userId,
          amount: perPerson,
          // If I (payer) am the participant, mark as settled instantly (I paid myself)
          status: userId === authStore.user?.id ? 'settled' : 'unpaid'
        });
      });
    }

    await expenseStore.addExpense(expense, payments);
    showToast('支出已成功添加', 'success');
    emit('success');
  } catch (error) {
    console.error('Failed to add expense:', error);
    showToast('添加費用失敗，請稍後再試', 'error');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
