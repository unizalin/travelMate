<script setup lang="ts">
import { useDialog } from '@/composables/useDialog'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import AlertDialog from '@/components/ui/AlertDialog.vue'
import Toast from '@/components/ui/Toast.vue'
import AuthModal from '@/components/auth/AuthModal.vue'

const { state, handleConfirm, handleCancel } = useDialog()
</script>

<template>
  <div>
    <!-- Global Toast Layer -->
    <Toast />

    <!-- Global Auth Modal -->
    <AuthModal />

    <!-- Global Confirm Dialog Layer -->
    <ConfirmDialog 
      v-if="state.type === 'confirm'"
      :is-open="state.isOpen"
      :title="state.title"
      :message="state.message"
      :type="state.dialogType"
      :confirm-text="state.confirmText"
      :cancel-text="state.cancelText"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />

    <!-- Global Alert Dialog Layer -->
    <AlertDialog 
      v-else
      :is-open="state.isOpen"
      :title="state.title"
      :message="state.message"
      :type="state.dialogType as any"
      @close="handleConfirm"
    />
  </div>
</template>
