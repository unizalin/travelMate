<template>
  <div class="space-y-8 max-w-lg mx-auto p-1">
    <!-- Amount & Currency Section -->
    <div class="space-y-3">
      <label class="block text-sm font-black text-secondary-500 uppercase tracking-widest">支出金額與幣值</label>
      <div class="space-y-3">
        <div class="flex gap-2">
          <!-- Currency Dropdown -->
          <div class="relative w-32 flex-shrink-0">
            <select 
              v-model="form.currency"
              class="w-full appearance-none px-4 py-4 bg-secondary-50 border-2 border-secondary-100 focus:border-primary-500 rounded-2xl text-base font-bold text-secondary-900 outline-none transition-all cursor-pointer"
            >
              <option v-for="c in currencies" :key="c.code" :value="c.code">
                {{ c.symbol }} {{ c.code }}
              </option>
            </select>
            <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-secondary-400">
              <ChevronDownIcon class="w-4 h-4" />
            </div>
          </div>

          <!-- Amount Input -->
          <div class="relative flex-1 group">
            <input 
              v-model.number="form.amount"
              type="number" 
              placeholder="0"
              required
              class="w-full px-5 py-4 bg-secondary-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl text-3xl font-black text-secondary-900 placeholder:text-secondary-200 transition-all outline-none"
            />
          </div>
        </div>

        <!-- Conversion Preview -->
        <div v-if="form.amount && form.currency !== preferredCurrency" class="flex items-center gap-2 px-4 py-2 bg-primary-50/50 rounded-xl border border-primary-100 animate-fade-in">
          <span class="text-xs font-bold text-primary-600">約等同於</span>
          <span class="text-sm font-black text-primary-700">{{ formatConvertedAmount }}</span>
          <span class="text-[10px] font-black text-primary-400 uppercase tracking-widest">使用即時匯率</span>
        </div>
      </div>
    </div>

    <!-- Expense Name Section -->
    <div class="space-y-3">
      <label class="block text-sm font-black text-secondary-500 uppercase tracking-widest">
        支出名稱 <span class="text-[10px] text-secondary-300 font-bold ml-1">(選填)</span>
      </label>
      <input 
        v-model="form.name"
        type="text" 
        placeholder="例如：一蘭拉麵、新宿地鐵..."
        class="w-full px-5 py-4 bg-secondary-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl text-secondary-900 placeholder:text-secondary-200 transition-all outline-none font-bold"
      />
    </div>

    <!-- Category Grid Section -->
    <div class="space-y-3">
      <label class="block text-sm font-black text-secondary-500 uppercase tracking-widest">分類</label>
      <div class="grid grid-cols-4 gap-2">
        <button 
          v-for="cat in categories" 
          :key="cat.name"
          type="button"
          @click="form.category = cat.name"
          class="flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all group"
          :class="form.category === cat.name ? `border-current ${cat.bg} ${cat.text}` : 'border-secondary-50 hover:border-secondary-100 bg-white'"
        >
          <component 
            :is="cat.icon" 
            class="w-6 h-6 transition-transform group-hover:scale-110" 
            :class="form.category === cat.name ? cat.text : 'text-secondary-400'" 
          />
          <span class="text-[10px] font-black" :class="form.category === cat.name ? cat.text : 'text-secondary-500'">{{ cat.name }}</span>
        </button>
      </div>
    </div>

    <!-- Split Mode Section -->
    <div class="space-y-4">
      <label class="block text-sm font-black text-secondary-500 uppercase tracking-widest">分帳方式</label>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button 
          v-for="mode in splitModes" 
          :key="mode.value"
          type="button"
          @click="form.splitMode = mode.value"
          class="relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-left group"
          :class="form.splitMode === mode.value ? 'border-primary-500 bg-primary-50/50 ring-4 ring-primary-500/10' : 'border-secondary-50 bg-white hover:border-secondary-100'"
        >
          <div 
            class="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
            :class="form.splitMode === mode.value ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-500'"
          >
            <component :is="mode.icon" class="w-5 h-5" />
          </div>
          <p class="text-sm font-black" :class="form.splitMode === mode.value ? 'text-primary-900' : 'text-secondary-900'">{{ mode.label }}</p>
          <p class="text-[10px] font-bold text-center" :class="form.splitMode === mode.value ? 'text-primary-600' : 'text-secondary-400'">{{ mode.desc }}</p>
          
          <div v-if="form.splitMode === mode.value" class="absolute top-2 right-2">
            <CheckCircleIcon class="w-5 h-5 text-primary-600" />
          </div>
        </button>
      </div>

      <!-- Custom Members Selection List -->
      <div v-if="form.splitMode === 'custom'" class="bg-secondary-50 p-4 rounded-3xl space-y-3 animate-fade-in">
        <div class="flex items-center justify-between mb-2">
           <p class="text-[10px] font-black text-secondary-400 uppercase tracking-widest">選擇分帳成員 ({{ form.selectedUserIds.length }} 位)</p>
           <p class="text-[10px] font-black text-primary-600">預計每人：{{ currentCurrencySymbol }}{{ perPersonAmount }}</p>
        </div>
        <div class="grid gap-2">
          <button 
            v-for="member in members" 
            :key="member.user_id"
            type="button"
            @click="toggleMember(member.user_id)"
            :disabled="member.user_id === authStore.user?.id"
            class="flex items-center justify-between p-3 rounded-xl border-2 transition-all bg-white"
            :class="[
              form.selectedUserIds.includes(member.user_id) ? 'border-primary-500 shadow-sm' : 'border-transparent grayscale opacity-60',
              member.user_id === authStore.user?.id ? 'cursor-default' : 'cursor-pointer'
            ]"
          >
            <div class="flex items-center gap-3">
              <div class="relative">
                <img :src="member.profiles?.avatar_url || 'https://via.placeholder.com/32'" class="w-8 h-8 rounded-full border border-secondary-100" />
                <div v-if="form.selectedUserIds.includes(member.user_id)" class="absolute -right-1 -bottom-1 bg-primary-600 text-white rounded-full p-0.5 ring-2 ring-white">
                  <CheckIcon class="w-2 h-2 stroke-[4]" />
                </div>
              </div>
              <div class="flex flex-col items-start">
                <span class="text-sm font-black text-secondary-900">
                  {{ member.profiles?.display_name }}
                  <span v-if="member.user_id === authStore.user?.id" class="text-[10px] text-primary-500 font-bold ml-1">(本人)</span>
                </span>
              </div>
            </div>
            <span v-if="form.selectedUserIds.includes(member.user_id)" class="text-xs font-mono font-bold text-primary-700">
              {{ currentCurrencySymbol }}{{ perPersonAmount }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-4 pt-4">
      <button 
        @click="$emit('cancel')"
        type="button" 
        class="flex-1 py-4 bg-secondary-100 hover:bg-secondary-200 text-secondary-900 rounded-2xl font-black transition-all active:scale-95"
      >
        取消
      </button>
      <button 
        @click="handleSubmit"
        :disabled="loading || !form.amount"
        type="button" 
        class="flex-[2] py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black shadow-xl shadow-primary-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        <span v-if="loading" class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
        {{ loading ? '保存中...' : '確認添加' }}
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
