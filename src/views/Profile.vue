<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { profileService } from '@/services/profileService'
import { UserCircleIcon, CameraIcon, ChevronLeftIcon } from '@heroicons/vue/24/outline'

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
    // Refresh user metadata optionally or just rely on session update if possible
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC]">
    <header class="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
         <div class="flex items-center gap-4">
            <router-link to="/trips" class="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-500">
                <ChevronLeftIcon class="h-5 w-5" />
            </router-link>
            <h1 class="text-xl font-bold text-gray-900">個人中心</h1>
         </div>
      </div>
    </header>

    <main class="py-10">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <!-- Banner / Decoration -->
          <div class="h-32 bg-gradient-to-r from-primary-500 to-blue-600"></div>
          
          <div class="px-6 pb-8 -mt-12">
            <!-- Avatar Section -->
            <div class="relative inline-block group">
              <div class="h-24 w-24 rounded-3xl bg-white p-1 shadow-xl">
                <div class="h-full w-full rounded-2xl bg-gray-50 overflow-hidden flex items-center justify-center border border-gray-100">
                  <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="h-full w-full object-cover" />
                  <UserCircleIcon v-else class="h-16 w-16 text-gray-300" />
                </div>
              </div>
              <!-- Avatar decoration / future upload button placeholder -->
              <div class="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-xl shadow-md cursor-pointer hover:scale-110 transition-transform hidden group-hover:block border border-gray-100">
                <CameraIcon class="h-4 w-4 text-primary-600" />
              </div>
            </div>

            <div class="mt-6 flex justify-between items-start">
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">{{ displayName || '旅行者' }}</h2>
                  <p class="text-sm text-gray-500 mt-1">{{ authStore.user?.email }}</p>
               </div>
            </div>

            <div v-if="message" class="mt-6 p-4 rounded-2xl bg-green-50 text-green-700 text-sm border border-green-100 flex items-center gap-2">
                <span class="text-lg">✅</span> {{ message }}
            </div>

            <div v-if="error" class="mt-6 p-4 rounded-2xl bg-red-50 text-red-700 text-sm border border-red-100 flex items-center gap-2">
                <span class="text-lg">❌</span> {{ error }}
            </div>

            <div class="mt-10">
              <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">基本資料編輯</h3>
              
              <form @submit.prevent="updateProfile" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div class="space-y-2">
                    <label for="displayName" class="block text-sm font-bold text-gray-700">顯示名稱</label>
                    <input
                      id="displayName"
                      type="text"
                      v-model="displayName"
                      placeholder="輸入您想顯示的名稱"
                      class="block w-full rounded-2xl border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-3 border transition-all"
                    />
                  </div>

                  <div class="space-y-2">
                    <label class="block text-sm font-bold text-gray-700">電子郵件 (不可修改)</label>
                    <input
                      type="text"
                      disabled
                      :value="authStore.user?.email"
                      class="block w-full rounded-2xl border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed sm:text-sm p-3 border"
                    />
                  </div>
                </div>

                <div class="pt-6 border-t border-gray-50 flex items-center justify-between">
                   <button
                    type="button"
                    @click="authStore.signOut()"
                    class="rounded-2xl px-6 py-2.5 text-sm font-bold text-red-500 border border-red-50 hover:bg-red-50 transition-all"
                  >
                    登出帳號
                  </button>
                  
                  <button
                    type="submit"
                    :disabled="saving"
                    class="rounded-2xl bg-primary-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-100 hover:bg-primary-500 hover:shadow-primary-200 transition-all disabled:opacity-50"
                  >
                    {{ saving ? '儲存中...' : '儲存變更' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        <div class="mt-8 text-center text-gray-400 text-xs">
          TravelMate &copy; 2026 - 您的個人專屬旅遊管理專家
        </div>
      </div>
    </main>
  </div>
</template>
