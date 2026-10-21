<script setup lang="ts">
import { computed, ref, watch } from 'vue'
const props = defineProps<{ date: string; accountId: string; tripId: string }>()
const checked=ref<string[]>([]),expanded=ref(false)
const options=[{label:'Umferðin 路況與攝影機',url:'https://umferdin.is/en'},{label:'Veður／SafeTravel 警報',url:'https://safetravel.is/'},{label:'油量過半',url:''},{label:'確認今日 Plan B',url:''}]
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Atlantic/Reykjavik',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const key=computed(()=>`tripbook.morning:${props.accountId}:${props.tripId}:${today()}:${props.date}`)
watch(key,()=>{try {const value:unknown=JSON.parse(localStorage.getItem(key.value)||'[]');checked.value=Array.isArray(value)?value.filter((v):v is string=>typeof v==='string'):[]}catch{checked.value=[]}expanded.value=false},{immediate:true})
function change(){try{localStorage.setItem(key.value,JSON.stringify(checked.value))}catch{}if(checked.value.length===4)expanded.value=false}
</script>
<template><section class="morning"><button type="button" :aria-expanded="expanded" @click="expanded=!expanded">晨間檢查 <span>{{ checked.length }}/4 {{ expanded ? '▴' : '▾' }}</span></button><div v-if="expanded" class="checks"><label v-for="option in options" :key="option.label"><input v-model="checked" type="checkbox" :value="option.label" @change="change" /><span>{{ option.label }}</span><a v-if="option.url" :href="option.url" target="_blank" rel="noreferrer" :aria-label="`查看${option.label}`">↗</a></label></div></section></template>
<style scoped>.morning{border:1px solid #dde3de;border-radius:10px;padding:0 10px;margin:10px 0;font-size:12px}.morning>button{width:100%;min-height:40px;display:flex;align-items:center;justify-content:space-between;font-weight:600}.morning button span{font-size:11px;color:#7a8783}.checks{display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;padding-bottom:8px}.checks label{display:flex;gap:6px;align-items:center;min-height:38px;font-size:11px;color:#5f706b}.checks input{accent-color:#397d86}.checks a{padding:8px;color:#397d86}</style>
