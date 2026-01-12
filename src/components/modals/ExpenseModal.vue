<template>
  <UIDialog :show="isOpen" @close="$emit('close')" title="添加支出" max-width="lg">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Amount Input -->
      <div class="space-y-2">
        <label class="block text-sm font-bold text-secondary-700">支出金額</label>
        <div class="relative group">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-secondary-300 group-focus-within:text-primary-500 transition-colors">$</span>
          <input 
            v-model="form.amount"
            type="number" 
            placeholder="0"
            required
            class="w-full pl-10 pr-4 py-4 bg-secondary-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl text-3xl font-black text-secondary-900 placeholder:text-secondary-200 transition-all outline-none"
          />
        </div>
      </div>

      <!-- Expense Name -->
      <div class="space-y-2">
        <label class="block text-sm font-bold text-secondary-700">支出名稱</label>
        <input 
          v-model="form.name"
          type="text" 
          placeholder="例如：晚餐、交通費..."
          required
          class="w-full px-4 py-3 bg-secondary-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-xl text-secondary-900 placeholder:text-secondary-200 transition-all outline-none"
        />
      </div>

      <!-- Categories -->
      <div class="space-y-2">
        <label class="block text-sm font-bold text-secondary-700">分類</label>
        <div class="grid grid-cols-4 gap-2">
          <button 
            v-for="cat in categories" 
            :key="cat.name"
            type="button"
            @click="form.category = cat.name"
            class="flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all"
            :class="form.category === cat.name ? 'border-primary-500 bg-primary-50/50' : 'border-secondary-50 hover:border-secondary-100'"
          >
            <component :is="cat.icon" class="w-5 h-5" :class="form.category === cat.name ? 'text-primary-600' : 'text-secondary-400'" />
            <span class="text-[10px] font-bold" :class="form.category === cat.name ? 'text-primary-700' : 'text-secondary-500'">{{ cat.name }}</span>
          </button>
        </div>
      </div>

      <!-- Payment Mode -->
      <div class="space-y-3 p-4 bg-secondary-50 rounded-2xl">
        <div class="flex items-center justify-between">
          <label class="text-sm font-bold text-secondary-700">自付或分帳</label>
          <div class="flex bg-white p-1 rounded-lg border border-secondary-100">
            <button 
              type="button"
              @click="form.expense_type = 'personal'"
              class="px-3 py-1 text-xs font-bold rounded-md transition-all"
              :class="form.expense_type === 'personal' ? 'bg-primary-600 text-white shadow-sm' : 'text-secondary-400 hover:bg-secondary-50'"
            >個人</button>
            <button 
              type="button"
              @click="form.expense_type = 'shared'"
              class="px-3 py-1 text-xs font-bold rounded-md transition-all"
              :class="form.expense_type === 'shared' ? 'bg-primary-600 text-white shadow-sm' : 'text-secondary-400 hover:bg-secondary-50'"
            >分帳</button>
          </div>
        </div>

        <!-- Split Members -->
        <div v-if="form.expense_type === 'shared'" class="space-y-2 mt-4 pt-4 border-t border-secondary-100">
          <p class="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">選擇平分成員</p>
          <div class="flex flex-wrap gap-2">
            <button 
              v-for="member in members" 
              :key="member.id"
              type="button"
              @click="toggleMember(member.user_id)"
              class="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 transition-all"
              :class="form.selectedMembers.includes(member.user_id) ? 'border-primary-500 bg-white' : 'border-transparent bg-secondary-100/50 grayscale opacity-60'"
            >
              <img :src="member.profiles?.avatar_url || 'https://via.placeholder.com/24'" class="w-5 h-5 rounded-full" />
              <span class="text-xs font-bold transition-colors" :class="form.selectedMembers.includes(member.user_id) ? 'text-primary-700' : 'text-secondary-500'">{{ member.profiles?.display_name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <button 
        type="submit" 
        :disabled="loading"
        class="w-full py-4 bg-secondary-900 hover:bg-black text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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
