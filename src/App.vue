<script setup lang="ts">
import { RouterView } from 'vue-router'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import AlertDialog from '@/components/ui/AlertDialog.vue'
import Toast from '@/components/ui/Toast.vue'
import { useDialog } from '@/composables/useDialog'
import { useToast } from '@/composables/useToast'

const { state: dialogState, handleConfirm, handleCancel } = useDialog()
const { state: toastState } = useToast()
</script>

<template>
  <RouterView />
  
  <ConfirmDialog
    v-if="dialogState.type === 'confirm'"
    :is-open="dialogState.isOpen"
    :title="dialogState.title"
    :message="dialogState.message"
    :type="dialogState.dialogType"
    :confirm-text="dialogState.confirmText"
    :cancel-text="dialogState.cancelText"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  />

  <AlertDialog
    v-else-if="dialogState.type === 'alert'"
    :is-open="dialogState.isOpen"
    :title="dialogState.title"
    :message="dialogState.message"
    :type="dialogState.dialogType as 'info' | 'success' | 'warning'"
    @close="handleCancel"
  />

  <Toast
    :show="toastState.show"
    :message="toastState.message"
    :type="toastState.type"
    @close="toastState.show = false"
  />
</template>
