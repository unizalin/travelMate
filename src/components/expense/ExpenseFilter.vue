<template>
  <div class="inline-flex p-1 bg-secondary-100 rounded-xl">
    <button 
      @click="filterMode = 'all'"
      class="px-4 py-1.5 rounded-lg text-xs font-black transition-all"
      :class="filterMode === 'all' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-400 hover:text-secondary-600'"
    >
      全部支出
    </button>
    <button 
      @click="filterMode = 'mine'"
      class="px-4 py-1.5 rounded-lg text-xs font-black transition-all"
      :class="filterMode === 'mine' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-400 hover:text-secondary-600'"
    >
      我的支出
    </button>
  </div>
</template>

<script setup lang="ts">
import { useExpenseStore } from '@/stores/expense';
import { storeToRefs } from 'pinia';

const expenseStore = useExpenseStore();
const { filterMode } = storeToRefs(expenseStore);
</script>
