<script setup lang="ts">
import { computed, nextTick, onMounted } from 'vue'
import { preciseMapTerms } from '@/data/icelandHandbook'
import Draggable from 'vuedraggable'
import type { JourneyItem } from '@/domain/tripJourney'
import PhotographySpots from './PhotographySpots.vue'
import ItineraryActivity from './ItineraryActivity.vue'
const props = defineProps<{ items: JourneyItem[]; editing: boolean; disabled?: boolean; today?: boolean }>()
const emit = defineEmits<{ reorder: [items: JourneyItem[]]; edit: [id: string, patch: Partial<JourneyItem>] }>()
const nextId = computed(() => props.today ? props.items.find(item => !['completed','skipped','cancelled','fallback'].includes(item.status))?.id : null)
const mapTerm = (item: JourneyItem) => Object.entries(preciseMapTerms).find(([name]) => item.name.includes(name))?.[1] || (item.id.startsWith('london-') && ['London','London／Cambridge'].includes(item.location || '') ? `${item.name}, ${item.date==='2026-10-26' && !/King|Pizza|Duck/.test(item.name) ? 'Cambridge' : 'London'}` : item.location || item.name)
onMounted(async () => { await nextTick(); if(nextId.value) document.getElementById(`activity-${nextId.value}`)?.scrollIntoView?.({block:'center',behavior:'smooth'}) })
</script>
<template>
  <Draggable :model-value="items" item-key="id" tag="ol" class="activities" handle=".drag-handle" :disabled="!editing || disabled" :animation="160" :delay="180" :delay-on-touch-only="true" @update:model-value="emit('reorder',$event)">
    <template #item="{ element: item, index }">
      <ItineraryActivity :item="item" :index="index" :editing="editing" :disabled="disabled" :next="item.id===nextId" :navigation-term="mapTerm(item)" @edit="(id,patch)=>emit('edit',id,patch)">
        <template #reminder><slot name="reminder" :item="item" /></template>
        <template #photography><PhotographySpots :item="item" /></template>
        <template #comments><slot name="comments" :item="item" /></template>
      </ItineraryActivity>
    </template>
  </Draggable>
</template>
<style scoped>
.activities{list-style:none;padding:0;margin-top:8px}
</style>
