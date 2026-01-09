<template>
  <div class="bg-white h-full border-l flex flex-col w-80 shadow-xl z-20">
    <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
      <h2 class="font-bold text-gray-900">行程天數</h2>
      <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
        <span class="sr-only">Close</span>
        ✕
      </button>
    </div>
    
    <div class="flex-1 overflow-y-auto p-4 space-y-3">
      <div 
        v-for="(_, index) in days" 
        :key="index"
        @click="$emit('select-day', index + 1)"
        class="group p-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all bg-white"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                D{{ index + 1 }}
            </span>
             <span class="font-medium text-gray-900 block">第 {{ index + 1 }} 天</span>
          </div>
          <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {{ getActivitiesCount(index) }} 個景點
          </span>
        </div>
        
        <!-- Mini Preview of first few items -->
         <div class="pl-10 space-y-1">
             <div v-for="activity in getPreviewActivities(index)" :key="activity.id" class="text-xs text-gray-500 truncate flex items-center gap-1">
                 <span class="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
                 {{ activity.name }}
             </div>
             <div v-if="getActivitiesCount(index) > 3" class="text-xs text-gray-400 pl-2.5">
                 ...還有 {{ getActivitiesCount(index) - 3 }} 個
             </div>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itineraries: any[]
}>()

defineEmits<{
  (e: 'select-day', day: number): void
  (e: 'close'): void
}>()

// Mock days array based on itineraries length
const days = props.itineraries || [];

const getActivitiesCount = (index: number) => {
  return props.itineraries[index]?.activities?.length || 0;
}

const getPreviewActivities = (index: number) => {
    return props.itineraries[index]?.activities?.slice(0, 3) || [];
}
</script>
