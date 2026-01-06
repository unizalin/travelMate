<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { profileService } from '@/services/profileService'

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
        displayName.value = authStore.user.user_metadata.full_name || ''
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
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
         <div class="flex justify-between items-center">
            <h1 class="text-3xl font-bold tracking-tight text-gray-900">個人資料</h1>
            <router-link to="/trips" class="text-sm font-semibold text-primary-600 hover:text-primary-500">
                &larr; 返回旅程列表
            </router-link>
         </div>
      </div>
    </header>

    <main>
      <div class="mx-auto max-w-3xl py-6 sm:px-6 lg:px-8">
        <div class="bg-white shadow sm:rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-base font-semibold leading-6 text-gray-900">個人資訊</h3>
            <div class="mt-2 text-sm text-gray-500">
              <p>在此更新您的個人資料。</p>
            </div>

            <div v-if="message" class="mt-4 p-4 rounded-md bg-green-50 text-green-700 text-sm">
                {{ message }}
            </div>

            <div v-if="error" class="mt-4 p-4 rounded-md bg-red-50 text-red-700 text-sm">
                {{ error }}
            </div>

            <form @submit.prevent="updateProfile" class="mt-5 space-y-6">
              <div>
                <label for="email" class="block text-sm font-bold text-gray-700">電子郵件</label>
                <div class="mt-1">
                  <input
                    type="text"
                    disabled
                    :value="authStore.user?.email"
                    class="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
                  />
                </div>
              </div>

               <div>
                <label for="displayName" class="block text-sm font-bold text-gray-700">顯示名稱</label>
                <div class="mt-1">
                  <input
                    id="displayName"
                    type="text"
                    v-model="displayName"
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
                  />
                </div>
              </div>

              <!-- Avatar implementation can be added later as it requires Storage -->

              <div class="flex justify-end gap-4">
                  <button
                    type="button"
                     @click="authStore.signOut()"
                    class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50"
                  >
                    登出
                  </button>
                  <button
                    type="submit"
                    :disabled="saving"
                    class="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50"
                  >
                    {{ saving ? '儲存中...' : '儲存' }}
                  </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
