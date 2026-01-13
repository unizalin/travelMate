<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { profileService } from '@/services/profileService'
import { UserCircleIcon, CameraIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const error = ref('')

const displayName = ref('')
const avatarUrl = ref('')

onMounted(async () => {
  if (!authStore.user) return

  try {
    loading.value = true
    const profile = await profileService.getProfile(authStore.user.id)
    if (profile) {
      displayName.value = profile.display_name || ''
      avatarUrl.value = profile.avatar_url || ''
    } else {
        // Fallback to auth metadata if profile doesn't exist yet
        displayName.value = authStore.user.user_metadata.display_name || authStore.user.user_metadata.full_name || ''
        avatarUrl.value = authStore.user.user_metadata.avatar_url || ''
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function updateProfile() {
  if (!authStore.user) return

  try {
    saving.value = true
    message.value = ''
    error.value = ''

    await profileService.updateProfile(authStore.user.id, {
      display_name: displayName.value,
    })

    message.value = '個人資料更新成功'
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

function getProviderIcon(provider: string) {
    // Determine provider from user identities or metadata if available
    // This is a simplified check as Supabase user object structure varies
    const identities = authStore.user?.identities || []
    const isLinked = identities.some(id => id.provider === provider)
    return isLinked
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white sticky top-0 z-10 shadow-sm/50">
      <div class="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
         <div class="flex items-center gap-4">
            <router-link to="/trips" class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                <ArrowLeftIcon class="h-5 w-5" />
            </router-link>
            <h1 class="text-lg font-bold text-gray-900">個人設定</h1>
         </div>
      </div>
    </header>

    <main class="py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
        
        <!-- Profile Card -->
        <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
                <!-- Avatar -->
                <div class="relative group">
                    <div class="h-24 w-24 rounded-full bg-gray-50 ring-4 ring-white shadow-lg overflow-hidden">
                        <img v-if="avatarUrl || authStore.user?.user_metadata?.avatar_url" 
                             :src="avatarUrl || authStore.user?.user_metadata?.avatar_url" 
                             alt="Avatar" class="h-full w-full object-cover" />
                        <div v-else class="h-full w-full flex items-center justify-center bg-primary-50 text-primary-300">
                            <UserCircleIcon class="h-16 w-16" />
                        </div>
                    </div>
                    <button class="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-gray-100 hover:bg-gray-50 transition-colors">
                        <CameraIcon class="h-4 w-4 text-gray-600" />
                    </button>
                </div>
                
                <!-- Info -->
                <div class="text-center sm:text-left flex-1 space-y-1">
                    <h2 class="text-2xl font-bold text-gray-900">{{ displayName || 'User' }}</h2>
                    <p class="text-sm text-gray-500 font-medium">{{ authStore.user?.email }}</p>
                    <div class="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                         <!-- Account Source Badges -->
                         <span v-if="getProviderIcon('google')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                             Google 連結
                         </span>
                         <span v-if="getProviderIcon('line')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-600 text-xs font-bold border border-green-100">
                             LINE 連結
                         </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Settings Form -->
        <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
             <div class="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
                <h3 class="text-sm font-black text-gray-900">基本資料</h3>
             </div>
             
             <div class="p-6 md:p-8">
                 <form @submit.prevent="updateProfile" class="space-y-6">
                    <div class="grid grid-cols-1 gap-6">
                        <div class="space-y-2">
                            <label for="displayName" class="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">顯示名稱</label>
                            <input
                                id="displayName"
                                type="text"
                                v-model="displayName"
                                class="block w-full rounded-2xl border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-3.5 border transition-all outline-none font-medium"
                            />
                        </div>

                        <div class="space-y-2">
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">電子郵件</label>
                            <div class="block w-full rounded-2xl border border-transparent bg-gray-50 text-gray-500 sm:text-sm p-3.5 font-medium">
                                {{ authStore.user?.email }}
                                <span class="float-right text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600 mt-0.5">不可修改</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="message" class="rounded-2xl bg-green-50 p-4 text-green-700 text-sm font-medium border border-green-100 flex items-center gap-2">
                        <span class="text-lg">✨</span> {{ message }}
                    </div>

                    <div v-if="error" class="rounded-2xl bg-red-50 p-4 text-red-700 text-sm font-medium border border-red-100 flex items-center gap-2">
                        <span class="text-lg">⚠️</span> {{ error }}
                    </div>

                    <div class="pt-4 flex items-center justify-end">
                        <button
                            type="submit"
                            :disabled="saving"
                            class="rounded-xl bg-primary-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-primary-100 hover:bg-primary-500 hover:shadow-primary-200 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                        >
                            {{ saving ? '儲存中...' : '儲存變更' }}
                        </button>
                    </div>
                </form>
             </div>
        </div>

        <!-- Danger Zone -->
        <div class="flex justify-center pt-6">
             <button
                type="button"
                @click="authStore.signOut()"
                class="text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-6 py-3 rounded-xl transition-all"
            >
                登出帳號
            </button>
        </div>

        <div class="mt-8 text-center">
             <p class="text-xs text-gray-400">TravelMate v1.0.0</p>
        </div>

      </div>
    </main>
  </div>
</template>
