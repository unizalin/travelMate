<script setup lang="ts">
import { RouterView } from 'vue-router'
import GlobalDialog from '@/components/common/GlobalDialog.vue'
import GlobalToast from '@/components/common/GlobalToast.vue'
</script>

<template>
  <div class="font-body text-secondary-900 antialiased">
    <RouterView />
    <GlobalDialog />
    <GlobalToast />
  </div>
</template>
