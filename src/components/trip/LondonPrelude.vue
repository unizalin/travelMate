<script setup lang="ts">
import { computed } from 'vue'
import type { JourneyItem, TripJourney } from '@/domain/tripJourney'
import LondonItinerary from './LondonItinerary.vue'
import ItineraryActivities from './ItineraryActivities.vue'
import AddItineraryActivity from './AddItineraryActivity.vue'
const props = withDefaults(defineProps<{ journey: TripJourney; canEdit?: boolean; sharedReady?: boolean; busy?: boolean; editing?: boolean; date?: string; embedded?: boolean }>(), { canEdit: false, sharedReady: false, busy: false, editing: false })
const emit = defineEmits<{ 'edit-item': [id: string, patch: Partial<JourneyItem>]; 'edit-plan': [date: string, field: 'keep' | 'skip', value: string]; toggle: []; reorder: [items: JourneyItem[]]; add: [date: string, name: string, location: string] }>()
const participants = computed(() => props.journey.members.filter(member => props.journey.items.some(item => item.id.startsWith('london-') && Array.isArray(item.participation) && item.participation.includes(member.id))).map(member => member.displayName || '姓名待設定').join('、'))
const editingLocked = computed(() => !props.canEdit || !props.sharedReady || props.busy)
</script>
<template>
  <LondonItinerary :journey="journey" :editing="editing" :date="date" :embedded="embedded">
    <template #participants><p class="prelude-people">參加：{{ participants }}</p></template>
    <template #plan="{ date, plan }"><div class="plan-b"><template v-if="editing"><label v-for="field in (['keep','skip'] as const)" :key="field">{{ field==='keep'?'保住':'先刪' }}<input :value="plan[field]" :disabled="editingLocked" maxlength="2000" @input="emit('edit-plan',date,field,($event.target as HTMLInputElement).value)" /></label></template><template v-else><b>保住</b> {{ plan.keep }} ｜ <b>先刪</b> {{ plan.skip }}</template></div></template>
    <template #activities="{ items, today }"><ItineraryActivities :items="items" :editing="editing" :disabled="editingLocked" :today="today" @edit="(id,patch)=>emit('edit-item',id,patch)" @reorder="emit('reorder',$event)"><template #comments="{ item }"><slot name="comments" :item="item" /></template></ItineraryActivities></template>
    <template #add="{ date }"><AddItineraryActivity v-if="canEdit" :editing="editing" :disabled="editingLocked" @start="!editing && emit('toggle')" @add="(name,location)=>emit('add',date,name,location)" /></template>
  </LondonItinerary>
</template>
<style scoped>
.prelude-people{font-size:12.5px;line-height:1.5;color:#7a8783;margin:6px 0 4px}.plan-b{font-size:12px;line-height:1.55;margin:8px 0 0;color:#7a8783}.plan-b b{color:#263331}.plan-b label{display:grid;gap:4px}.plan-b input{min-height:44px;border:1px solid #ccd5cf;border-radius:8px;padding:8px;background:white}
</style>
