<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  CalendarDaysIcon, 
  MapIcon, 
  UserIcon,
  SparklesIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const TARGET_TRIP_ID = '2b6a733a-249f-4d77-8be1-a3e9742ae69d'

const tabs = [
  { 
    name: '總覽', 
    path: `/trips/${TARGET_TRIP_ID}`, 
    icon: CalendarDaysIcon 
  },
  { 
    name: '地圖', 
    path: `/trips/${TARGET_TRIP_ID}/map`, 
    icon: MapIcon 
  },
  { 
    name: '願望', 
    path: `/trips/${TARGET_TRIP_ID}`, // In TripDetail, this is a tab, but for mobile-first we might want a direct link or just stay on detail
    icon: SparklesIcon,
    query: { tab: '願望清單' }
  },
  { 
    name: '個人', 
    path: '/profile', 
    icon: UserIcon 
  }
]

const currentPath = computed(() => route.path)

function isActive(tab: any) {
  if (tab.path === '/profile' && currentPath.value === '/profile') return true
  if (tab.path.includes('/map') && currentPath.value.includes('/map')) return true
  if (!tab.path.includes('/map') && tab.path.includes('/trips/') && currentPath.value.includes('/trips/') && !currentPath.value.includes('/map')) {
    // If it's a specific trip detail page
    return true
  }
  return currentPath.value === tab.path
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-[100] lg:hidden">
    <!-- Blur Background -->
    <div class="absolute inset-x-0 bottom-0 h-24 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-2xl border-t border-gray-100 dark:border-white/5 safe-area-bottom"></div>
    
    <div class="relative flex justify-around items-center h-20 px-4 safe-area-bottom">
      <router-link 
        v-for="tab in tabs" 
        :key="tab.name"
        :to="{ path: tab.path, query: tab.query }"
        class="flex flex-col items-center gap-1 group transition-all"
        :class="isActive(tab) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-white/20'"
      >
        <div 
          class="p-2 rounded-2xl transition-all duration-300 relative"
          :class="isActive(tab) ? 'bg-primary-50 dark:bg-primary-900/20 scale-110' : 'group-hover:bg-gray-50 dark:group-hover:bg-white/5'"
        >
          <component :is="tab.icon" class="w-6 h-6 stroke-[2]" />
          <!-- Active Dot -->
          <div 
            v-if="isActive(tab)"
            class="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full border-2 border-white dark:border-secondary-900 animate-pop-in"
          ></div>
        </div>
        <span class="text-[10px] font-black uppercase tracking-widest">{{ tab.name }}</span>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
