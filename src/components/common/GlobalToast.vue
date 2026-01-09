<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import UIToast from '@/components/ui/Toast.vue';
import { ref, watch } from 'vue';

const { state } = useToast();
const toastRef = ref<any>(null);

watch(() => state.show, (newVal) => {
  if (newVal && toastRef.value) {
    toastRef.value.add({
      type: state.type,
      title: state.type.charAt(0).toUpperCase() + state.type.slice(1),
      message: state.message,
      duration: 3000
    });
  }
});
</script>

<template>
  <UIToast ref="toastRef" />
</template>
