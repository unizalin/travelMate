<template>
  <div v-if="loading || travelInfo" class="flex flex-col items-center py-2 relative group">
    <!-- Vertical Connector Line (Background) -->
    <div class="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-100 dark:bg-white/5"></div>
    
    <!-- Travel Info Badge -->
    <div 
        class="relative z-10 px-4 py-2 bg-white dark:bg-secondary-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-lg flex items-center gap-3 transition-all duration-300 group-hover:scale-105 group-hover:border-primary-500/20"
        :class="loading ? 'animate-pulse opacity-60' : ''"
    >
        <div class="flex items-center gap-2">
            <component :is="profileIcon" class="w-3.5 h-3.5 text-primary-500" />
            <div class="flex flex-col">
                <div v-if="loading" class="h-3 w-16 bg-gray-100 dark:bg-white/10 rounded animate-pulse"></div>
                <template v-else-if="travelInfo">
                    <span class="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest whitespace-nowrap">
                        {{ travelInfo.duration }} MIN
                    </span>
                    <span class="text-[8px] font-bold text-gray-400 dark:text-white/20 uppercase tracking-widest leading-none">
                        {{ travelInfo.distance }} KM
                    </span>
                </template>
            </div>
        </div>
        
        <!-- Profile Switcher (Hidden by default, shown on hover?) -->
        <div class="h-4 w-px bg-gray-100 dark:bg-white/10 mx-1"></div>
        <span class="text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest opacity-60">
            {{ currentProfileLabel }}
        </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { mapboxService } from '@/services/mapboxService';
import { 
    TruckIcon, 
    UserIcon, 
    KeyIcon // Using KeyIcon as placeholder if others unavailable, but usually HeroIcons has more
} from '@heroicons/vue/24/outline';

const props = defineProps<{
    start: [number, number]; // [lng, lat]
    end: [number, number];   // [lng, lat]
    profile?: 'driving' | 'walking' | 'cycling';
}>();

const travelInfo = ref<{ duration: number; distance: number } | null>(null);
const loading = ref(false);
const currentProfile = ref(props.profile || 'driving');

const profileIcon = computed(() => {
    switch (currentProfile.value) {
        case 'walking': return UserIcon;
        case 'cycling': return KeyIcon; // Change to cycling icon if found
        default: return TruckIcon;
    }
});

const currentProfileLabel = computed(() => {
    switch (currentProfile.value) {
        case 'walking': return 'Walk';
        case 'cycling': return 'Bike';
        default: return 'Drive';
    }
});

async function updateTravelInfo() {
    if (!props.start || !props.end) return;
    try {
        loading.value = true;
        const info = await mapboxService.getTravelTime(props.start, props.end, currentProfile.value);
        travelInfo.value = info;
    } catch (e) {
        console.error('Travel info fetch error:', e);
    } finally {
        loading.value = false;
    }
}

onMounted(updateTravelInfo);
watch(() => [props.start, props.end, props.profile], updateTravelInfo);
</script>
