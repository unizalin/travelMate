<template>
  <UIDialog :show="isOpen" @close="$emit('close')" title="添加支出" max-width="lg">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Amount Input -->
      <div class="space-y-2">
        <label class="block text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest px-1 transition-colors">支出金額</label>
        <div class="relative group transition-all">
          <span class="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300 dark:text-white/20 group-focus-within:text-primary-500 transition-colors">$</span>
          <input 
            v-model="form.amount"
            type="number" 
            placeholder="0"
            required
            class="w-full pl-14 pr-6 py-6 bg-gray-50 dark:bg-white/5 border-none rounded-2xl text-4xl font-black text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10 focus:ring-4 focus:ring-primary-500/10 focus:bg-white dark:focus:bg-secondary-900 transition-all outline-none"
          />
        </div>
      </div>

      <!-- Expense Name -->
      <div class="space-y-2">
        <label class="block text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest px-1 transition-colors">支出名稱</label>
        <input 
          v-model="form.name"
          type="text" 
          placeholder="例如：晚餐、交通費..."
          required
          class="w-full px-6 py-4 bg-gray-50 dark:bg-white/5 border-none rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10 focus:ring-4 focus:ring-primary-500/10 focus:bg-white dark:focus:bg-secondary-900 transition-all outline-none"
        />
      </div>

      <!-- Categories -->
      <div class="space-y-4">
        <label class="block text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest px-1 transition-colors">分類</label>
        <div class="grid grid-cols-4 gap-2">
          <button 
            v-for="cat in categories" 
            :key="cat.name"
            type="button"
            @click="form.category = cat.name"
            class="flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95"
            :class="form.category === cat.name ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 shadow-lg shadow-primary-500/10' : 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 hover:border-gray-200 dark:hover:border-white/10'"
          >
            <component :is="cat.icon" class="w-5 h-5 transition-colors" :class="form.category === cat.name ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-white/20'" />
            <span class="text-[9px] font-black uppercase tracking-widest transition-colors" :class="form.category === cat.name ? 'text-primary-700 dark:text-primary-400' : 'text-gray-400 dark:text-white/20'">{{ cat.name }}</span>
          </button>
        </div>
      </div>

      <!-- Payment Mode -->
      <div class="space-y-4 p-6 bg-gray-50 dark:bg-white/5 rounded-[2rem] transition-colors">
        <div class="flex items-center justify-between">
          <label class="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest px-1 transition-colors">自付或分帳</label>
          <div class="flex bg-white dark:bg-secondary-900 p-1.5 rounded-xl border border-gray-100 dark:border-white/10 transition-colors shadow-sm">
            <button 
              type="button"
              @click="form.expense_type = 'personal'"
              class="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
              :class="form.expense_type === 'personal' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 dark:text-white/20 hover:bg-gray-50 dark:hover:bg-white/5'"
            >個人</button>
            <button 
              type="button"
              @click="form.expense_type = 'shared'"
              class="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
              :class="form.expense_type === 'shared' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 dark:text-white/20 hover:bg-gray-50 dark:hover:bg-white/5'"
            >分帳</button>
          </div>
        </div>

        <!-- Split Members -->
        <div v-if="form.expense_type === 'shared'" class="space-y-3 mt-4 pt-6 border-t border-gray-100 dark:border-white/5 transition-colors">
          <p class="text-[9px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest px-1 transition-colors">選擇平分成員</p>
          <div class="flex flex-wrap gap-2">
            <button 
              v-for="member in members" 
              :key="member.id"
              type="button"
              @click="toggleMember(member.user_id)"
              class="flex items-center gap-2 pl-1 pr-4 py-1 rounded-full border transition-all active:scale-95"
              :class="form.selectedMembers.includes(member.user_id) ? 'border-primary-500 bg-white dark:bg-white/10 shadow-lg shadow-primary-500/5' : 'border-transparent bg-gray-100 dark:bg-white/5 grayscale opacity-40'"
            >
              <img :src="member.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + member.user_id" class="w-6 h-6 rounded-full border border-gray-100 dark:border-white/10 bg-secondary-100" />
              <span class="text-[10px] font-black uppercase tracking-widest transition-colors" :class="form.selectedMembers.includes(member.user_id) ? 'text-primary-700 dark:text-primary-400' : 'text-gray-400 dark:text-white/20'">{{ member.profiles?.display_name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <button 
        type="submit" 
        :disabled="loading"
        class="w-full py-5 bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-gray-900/20 dark:shadow-white/10 active:scale-95"
      >
        <span v-if="loading" class="w-4 h-4 border-2 border-white/30 dark:border-gray-300 border-t-white dark:border-t-gray-900 rounded-full animate-spin"></span>
        {{ loading ? '保存中...' : '確認添加' }}
      </button>
    </form>
  </UIDialog>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import UIDialog from '@/components/ui/Dialog.vue';
import { 
  ShoppingBagIcon, 
  TicketIcon, 
  CakeIcon, 
  MapIcon, 
  TruckIcon, 
  HomeIcon,
  EllipsisHorizontalCircleIcon,
} from '@heroicons/vue/24/outline';
import { useExpenseStore } from '@/stores/expense';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  isOpen: boolean
  tripId: string
  members: any[]
}>();

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>();

const expenseStore = useExpenseStore();
const authStore = useAuthStore();
const loading = ref(false);

const categories = [
  { name: '餐飲', icon: CakeIcon },
  { name: '交通', icon: TruckIcon },
  { name: '住宿', icon: HomeIcon },
  { name: '購物', icon: ShoppingBagIcon },
  { name: '門票', icon: TicketIcon },
  { name: '娛樂', icon: MapIcon },
  { name: '其他', icon: EllipsisHorizontalCircleIcon },
];

const form = reactive({
  name: '',
  amount: 0,
  category: '餐飲',
  expense_type: 'shared' as 'shared' | 'personal',
  selectedMembers: [] as string[]
});

onMounted(() => {
  // Default to all members selected
  form.selectedMembers = props.members.map(m => m.user_id);
});

function toggleMember(userId: string) {
  const index = form.selectedMembers.indexOf(userId);
  if (index > -1) {
    if (form.selectedMembers.length > 1) {
       form.selectedMembers.splice(index, 1);
    }
  } else {
    form.selectedMembers.push(userId);
  }
}

async function handleSubmit() {
  if (!authStore.user) return;
  
  try {
    loading.value = true;
    
    const expense = {
      trip_id: props.tripId,
      name: form.name,
      amount: form.amount,
      category: form.category,
      expense_type: form.expense_type,
      paid_by: authStore.user.id,
      currency: 'TWD',
      split_members: form.expense_type === 'shared' ? form.selectedMembers : null
    };

    const payments: any[] = [];
    if (form.expense_type === 'shared') {
      const perPerson = form.amount / form.selectedMembers.length;
      form.selectedMembers.forEach(userId => {
        payments.push({
          payer_id: userId,
          amount: perPerson,
          is_paid: userId === authStore.user?.id
        });
      });
    }

    await expenseStore.addExpense(expense, payments);
    emit('success');
    emit('close');
  } catch (error) {
    console.error('Failed to add expense:', error);
  } finally {
    loading.value = false;
  }
}
</script>
