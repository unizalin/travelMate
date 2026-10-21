<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps<{ editing: boolean; disabled: boolean }>()
const emit = defineEmits<{ start: []; add: [name: string, location: string] }>()
const opened = ref(false), name = ref(''), location = ref('')
function open() { emit('start'); opened.value = true }
function add() { if(!props.disabled && name.value.trim()) { emit('add',name.value.trim(),location.value.trim()); name.value=''; location.value=''; opened.value=false } }
</script>
<template><div class="add-activity"><button v-if="!opened || !editing" type="button" :disabled="disabled" @click="open">＋ 加行程</button><form v-else @submit.prevent="add"><label>活動名稱<input v-model="name" required maxlength="200" :disabled="disabled" /></label><label>導航搜尋詞<input v-model="location" maxlength="300" :disabled="disabled" /></label><div><button type="submit" :disabled="disabled || !name.trim()">加入</button><button type="button" @click="opened=false">取消</button></div></form></div></template>
<style scoped>.add-activity{margin:12px 0 0;border:1.5px dashed #dde3de;border-radius:12px;color:#7a8783;font-size:13px}.add-activity>button{min-height:44px;padding:10px 0;width:100%}.add-activity form{display:grid;gap:8px;padding:12px}.add-activity label{display:grid;gap:4px}.add-activity input{min-height:44px;border:1px solid #ccd5cf;border-radius:8px;padding:8px;background:white}.add-activity form button{min-height:44px;padding:6px 18px;color:#397d86}.add-activity button:disabled{opacity:.4}</style>
