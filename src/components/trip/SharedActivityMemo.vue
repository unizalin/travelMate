<script setup lang="ts">
import { ref, watch } from 'vue'
const props=defineProps<{ activityId:string; memo?:{content:string;updatedByName?:string|null;updatedAt:string|null}; canEdit:boolean; busy:boolean }>()
const emit=defineEmits<{save:[content:string]}>()
const text=ref(props.memo?.content??''); const editing=ref(false)
watch(()=>props.activityId,()=>{text.value=props.memo?.content??'';editing.value=false})
watch(()=>props.memo,()=>{if(!editing.value)text.value=props.memo?.content??''})
</script>
<template>
 <section class="my-3 rounded-lg border border-stone-200 p-3 text-sm" aria-label="活動共用 Memo">
  <h4 class="font-semibold">共用 Memo</h4>
  <p v-if="memo?.updatedAt" class="my-1 text-xs text-stone-500">最後修改：{{memo.updatedByName||'成員'}} · {{new Date(memo.updatedAt).toLocaleString('zh-TW')}}</p>
  <template v-if="canEdit"><textarea v-model="text" aria-label="共用 Memo" rows="2" maxlength="2000" class="mt-2 w-full rounded-lg border p-2" :disabled="busy" @input="editing=true" /><button class="min-h-11 underline" :disabled="busy || text===(memo?.content??'')" @click="emit('save',text)">儲存 Memo</button></template>
  <p v-else class="whitespace-pre-wrap">{{memo?.content||'尚無 Memo'}}</p>
 </section>
</template>
