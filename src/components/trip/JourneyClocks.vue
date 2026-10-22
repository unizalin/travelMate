<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
const props = withDefaults(defineProps<{ region?: 'london' | 'iceland'; combined?: boolean }>(), { region: 'iceland', combined: false })
const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | undefined
const london = computed(() => format('Europe/London'))
const iceland = computed(() => format('Atlantic/Reykjavik'))
const local = computed(() => format(props.region === 'london' ? 'Europe/London' : 'Atlantic/Reykjavik'))
const taiwan = computed(() => format('Asia/Taipei'))
function format(timeZone: string) { return new Intl.DateTimeFormat('zh-TW',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now.value) }
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 20000) })
onBeforeUnmount(() => { if(timer) clearInterval(timer) })
</script>
<template><p v-if="props.combined" class="clocks">倫敦 <b>{{ london }}</b><span> · </span>冰島 <b>{{ iceland }}</b><span> · </span>台灣 <b>{{ taiwan }}</b></p><div v-else class="clocks dual-clock"><span><small>{{ props.region === 'london' ? '倫敦' : '冰島' }}當地現在</small><b>{{ local }}</b></span><span><small>台灣現在</small><b>{{ taiwan }}</b></span></div></template>
<style scoped>.clocks{font-size:12px;color:#7a8783;margin-top:5px}.clocks b{color:#263331;font-weight:500;font-variant-numeric:tabular-nums}.clocks span{margin:0 5px;color:#b6c0ba}.dual-clock{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dual-clock>span{margin:0}.dual-clock small{display:block;font-size:12px}.dual-clock b{display:block;font-size:17px;margin-top:5px}</style>
