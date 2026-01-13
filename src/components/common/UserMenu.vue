<script setup lang="ts">
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { ArrowRightOnRectangleIcon, UserIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

function handleLogout() {
  authStore.signOut()
}

function goToProfile() {
  router.push('/profile')
}
</script>

<template>
  <Menu as="div" class="relative ml-3">
    <div>
      <MenuButton
        class="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 hover:ring-2 hover:ring-gray-200 transition-all"
      >
        <span class="sr-only">Open user menu</span>
        <img
          v-if="authStore.user?.user_metadata?.avatar_url || authStore.user?.user_metadata?.picture"
          class="h-10 w-10 rounded-full object-cover border border-gray-200"
          :src="authStore.user?.user_metadata?.avatar_url || authStore.user?.user_metadata?.picture"
          alt="User Avatar"
        />
        <div v-else class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 border border-primary-200">
             <span class="text-sm font-bold">{{ (authStore.user?.email || 'U').charAt(0).toUpperCase() }}</span>
        </div>
      </MenuButton>
    </div>
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <MenuItems
        class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-2xl bg-white py-1 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden"
      >
        <div class="px-4 py-3 border-b border-gray-50">
           <p class="text-sm font-bold text-gray-900 truncate">{{ authStore.user?.user_metadata?.name || authStore.user?.user_metadata?.display_name || 'User' }}</p>
           <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
        </div>
        
        <div class="p-1">
            <MenuItem v-slot="{ active }">
            <button
                @click="goToProfile"
                :class="[
                active ? 'bg-gray-50 text-gray-900' : 'text-gray-700',
                'group flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors'
                ]"
            >
                <UserIcon class="mr-2 h-4 w-4 text-gray-400 group-hover:text-primary-500" aria-hidden="true" />
                個人資料
            </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
            <button
                @click="handleLogout"
                :class="[
                active ? 'bg-red-50 text-red-600' : 'text-gray-700',
                'group flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors'
                ]"
            >
                <ArrowRightOnRectangleIcon class="mr-2 h-4 w-4 text-gray-400 group-hover:text-red-500" aria-hidden="true" />
                登出
            </button>
            </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>
