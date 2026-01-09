<script setup lang="ts">
import { useDialog } from '@/composables/useDialog';
import UIDialog from '@/components/ui/Dialog.vue';
import UIButton from '@/components/ui/Button.vue';

const { state, handleConfirm, handleCancel } = useDialog();
</script>

<template>
  <UIDialog
    :show="state.isOpen"
    :title="state.title"
    @close="handleCancel"
    max-width="sm"
  >
    <div class="flex flex-col items-center text-center">
      <!-- Icon representation based on type -->
      <div :class="['mb-4 p-3 rounded-full bg-opacity-10', state.dialogType === 'error' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600']">
        <svg v-if="state.dialogType === 'success'" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else-if="state.dialogType === 'error'" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else-if="state.dialogType === 'warning'" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <svg v-else class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <p class="text-secondary-600 font-body">{{ state.message }}</p>
    </div>

    <template #footer>
      <UIButton variant="ghost" @click="handleCancel">
        {{ state.cancelText || '取消' }}
      </UIButton>
      <UIButton 
        :variant="state.dialogType === 'error' ? 'danger' : 'primary'" 
        @click="handleConfirm"
      >
        {{ state.confirmText || '確認' }}
      </UIButton>
    </template>
  </UIDialog>
</template>
