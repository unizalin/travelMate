<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ICELAND_TRIP_ID } from '@/router/iceland'
import { CalendarDaysIcon, UserIcon, UsersIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const tripId = computed(() => String(route.params.tripId || ICELAND_TRIP_ID))

const tabs = computed(() => [
  { name: '行程', path: `/trips/${tripId.value}/journey`, icon: CalendarDaysIcon },
  { name: '航班', path: `/trips/${tripId.value}/journey?section=flights`, icon: UsersIcon },
  { name: '個人', path: '/profile', icon: UserIcon },
])

const currentPath = computed(() => route.path)

function isActive(path: string): boolean {
  const [pathname, query] = path.split('?')
  if (pathname.endsWith('/journey')) return currentPath.value === pathname && (query ? route.query.section === 'flights' : route.query.section !== 'flights')
  return currentPath.value === pathname || currentPath.value.startsWith(`${pathname}/`)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-[100] lg:hidden" aria-label="主要導覽">
    <div class="absolute inset-x-0 bottom-0 h-24 border-t border-slate-200/80 bg-white/85 backdrop-blur-2xl dark:border-white/5 dark:bg-secondary-900/85"></div>
    <div class="relative flex h-20 items-center justify-around px-4 pb-safe">
      <router-link v-for="tab in tabs" :key="tab.name" :to="tab.path" class="group flex flex-col items-center gap-1 transition-all" :class="isActive(tab.path) ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-white/35'">
        <div class="relative rounded-2xl p-2 transition" :class="isActive(tab.path) ? 'bg-primary-50 dark:bg-primary-900/20' : 'group-hover:bg-slate-50 dark:group-hover:bg-white/5'">
          <component :is="tab.icon" class="h-6 w-6 stroke-[2]" />
          <div v-if="isActive(tab.path)" class="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-white bg-primary-500 dark:border-secondary-900"></div>
        </div>
        <span class="text-[10px] font-black tracking-widest">{{ tab.name }}</span>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
