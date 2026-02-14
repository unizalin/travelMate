<template>
  <div 
    class="min-h-screen transition-colors duration-500 selection:bg-primary-500/30 font-sans bg-slate-50 dark:bg-[#050b18] text-slate-900 dark:text-white"
  >
    <!-- Background Decoration -->
    <div class="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div :class="[
          'absolute inset-0',
          theme === 'dark' ? 'bg-[radial-gradient(circle_at_50%_0%,#3b82f622_0%,transparent_50%)]' : 'bg-[radial-gradient(circle_at_50%_0%,#3b82f611_0%,transparent_50%)]'
        ]"></div>
        <div :class="[
          'absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]',
          theme === 'dark' ? 'opacity-100' : 'opacity-40'
        ]"></div>
    </div>

    <!-- Theme Toggle Floating Button -->
    <div class="fixed bottom-8 right-8 z-[100]">
      <button 
        @click="toggleTheme"
        class="p-4 rounded-3xl bg-white/10 dark:bg-white/5 backdrop-blur-3xl border border-black/5 dark:border-white/10 shadow-2xl hover:scale-110 active:scale-95 transition-all group"
        :title="theme === 'dark' ? '切換至淺色模式' : '切換至深色模式'"
      >
        <span v-if="theme === 'dark'" class="text-xl">☀️</span>
        <span v-else class="text-xl">🌙</span>
      </button>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center min-h-screen relative z-10">
        <div class="relative w-24 h-24">
            <div class="absolute inset-0 border-4 border-primary-500/10 rounded-full"></div>
            <div class="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p :class="['mt-8 text-xs font-black uppercase tracking-[0.3em] animate-pulse', theme === 'dark' ? 'text-white/30' : 'text-slate-400']">Initializing Trip Data...</p>
    </div>

    <div v-else-if="error" class="max-w-md mx-auto text-center py-20 relative z-10 min-h-screen flex flex-col justify-center items-center">
        <div class="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
            <ExclamationTriangleIcon class="w-8 h-8" />
        </div>
        <h3 class="text-xl font-black mb-2">無法讀取資料</h3>
        <p :class="['text-sm mb-8 leading-relaxed', theme === 'dark' ? 'text-white/40' : 'text-slate-500']">{{ error }}</p>
        <button @click="tripStore.fetchTripById(tripId)" class="px-8 py-3 bg-red-500/10 text-red-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">重試</button>
    </div>

    <div v-else-if="!currentTrip && !loading" class="flex flex-col items-center justify-center min-h-screen px-4 text-center relative z-10">
      <div class="mb-10 rounded-[2.5rem] bg-white dark:bg-secondary-900 border border-black/5 dark:border-white/5 p-8 shadow-2xl relative">
        <span class="text-5xl">🔒</span>
        <div class="absolute inset-0 bg-primary-500/10 blur-3xl rounded-full"></div>
      </div>
      <h2 :class="['text-2xl font-black mb-4', theme === 'dark' ? 'text-white' : 'text-slate-900']">核心存取限制</h2>
      <p :class="['max-w-md mb-10 leading-relaxed font-medium', theme === 'dark' ? 'text-white/40' : 'text-slate-500']">
        您可能沒有權限查看此行程，或是該行程不存在。請確保您已獲得授權或檢查邀請連結。
      </p>
    </div>

    <div v-else-if="currentTrip" class="relative z-10 pt-12">
      <!-- Main Content / Tabs Area -->
      <main class="mx-auto max-w-[1600px] px-6 pb-24">
        <TabGroup>
          <div class="flex flex-col lg:flex-row gap-8">
            <!-- Sidebar Navigation -->
            <aside class="w-full lg:w-72 shrink-0">
                <TabList class="flex lg:flex-col items-center lg:items-stretch gap-1.5 p-1.5 bg-slate-200/50 dark:bg-white/5 backdrop-blur-3xl rounded-[1.5rem] border border-slate-200 dark:border-white/10 shadow-inner overflow-x-auto lg:overflow-x-visible no-scrollbar">
              <Tab
                v-for="tab in tabs"
                :key="tab.name"
                v-slot="{ selected }"
                as="template"
              >
                <button
                  :class="[
                    'px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-2xl outline-none focus:ring-0 whitespace-nowrap lg:whitespace-normal',
                    selected
                      ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-white shadow-xl transform scale-[1.02]'
                      : 'text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 hover:bg-white/50 dark:hover:bg-white/5'
                  ]"
                >
                  <div class="flex items-center lg:justify-start gap-2">
                    <component :is="tab.icon" class="w-3.5 h-3.5" />
                    <span>{{ tab.name }}</span>
                  </div>
                </button>
              </Tab>
            </TabList>

                <!-- Additional Sidebar Info (Organizer perspective) -->
                <div v-if="isOrganizer" class="mt-8 p-6 bg-white/5 border border-white/5 rounded-[2rem] backdrop-blur-2xl hidden lg:block">
                    <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-400 mb-6 flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                        Mission Control
                    </h4>
                    
                    <div class="space-y-6">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-black text-white/40 uppercase tracking-widest">公開行程</span>
                            <button 
                                @click="tripStore.updateTrip(tripId, { is_public: !currentTrip.is_public })"
                                class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                                :class="currentTrip.is_public ? 'bg-primary-600' : 'bg-white/10'"
                            >
                                <span 
                                    class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xl transition duration-200 ease-in-out"
                                    :class="currentTrip.is_public ? 'translate-x-5' : 'translate-x-0'"
                                ></span>
                            </button>
                        </div>
                        
                        <div class="p-4 bg-primary-600/10 border border-primary-500/20 rounded-2xl">
                            <div class="text-[8px] font-black uppercase tracking-widest text-primary-400 mb-2">Invite Code</div>
                            <div class="font-mono text-sm text-white flex items-center justify-between">
                                <span>{{ currentTrip.invite_code }}</span>
                                <button class="p-1 hover:text-primary-400 transition-colors">📋</button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- Main Content Panels -->
            <div class="flex-1 min-w-0">
                <TabPanels>
                    <TabPanel v-for="tab in tabs" :key="tab.name" class="outline-none">
                        <ItineraryView v-if="tab.name === '行程'" class="dark-view" />
                        <div v-else-if="tab.name === '費用'" class="bg-white/5 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 min-h-[500px]">
                            <ExpenseView 
                                :trip-id="tripId" 
                                :members="currentTrip.trip_members" 
                            />
                        </div>
                        <CandidateActivitiesView 
                            v-else-if="tab.name === '願望清單'"
                            :trip-id="tripId"
                            :trip-info="{
                                destination: currentTrip.destination,
                                startDate: currentTrip.start_date,
                                endDate: currentTrip.end_date,
                                totalDays: itineraries.length || 1
                            }"
                        />
                        <div v-else-if="tab.name === '成員'" class="space-y-8">
                            <div class="bg-white/5 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8">
                                <h3 class="text-xl font-black mb-8 flex items-center gap-3">
                                    <span class="text-primary-500">#</span> 團隊成員
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div v-for="member in currentTrip.trip_members" :key="member.id" 
                                        class="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all group">
                                    <img class="h-12 w-12 rounded-full border-2 border-primary-500/20 group-hover:border-primary-500 transition-colors"
                                        :src="member.profiles?.avatar_url || 'https://via.placeholder.com/40'" />
                                    <div>
                                        <p class="text-sm font-black text-white">{{ member.profiles?.display_name || '未知成員' }}</p>
                                        <p class="text-[10px] font-black uppercase tracking-widest text-white/20">{{ member.role }}</p>
                                    </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Preparation Checklist -->
                            <div class="bg-white/5 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8">
                                <PreparationChecklist :trip-id="tripId" />
                            </div>
                        </div>
                    </TabPanel>
                </TabPanels>
            </div>
          </div>
        </TabGroup>
      </main>

      <InviteModal 
        :is-open="isInviteModalOpen" 
        :invite-code="currentTrip.invite_code"
        :trip-id="tripId"
        @close="isInviteModalOpen = false" 
      />

      <ShareDialog 
        :is-open="isShareModalOpen" 
        :trip-id="tripId" 
        :trip-name="currentTrip.name"
        @close="isShareModalOpen = false" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import InviteModal from '@/components/modals/InviteModal.vue'
import ShareDialog from '@/components/modals/ShareDialog.vue'
import ItineraryView from '@/views/Itinerary.vue'
import ExpenseView from '@/components/trip/ExpenseView.vue'
import CandidateActivitiesView from '@/views/CandidateActivitiesView.vue'
import PreparationChecklist from '@/components/preparation/PreparationChecklist.vue'
import { useAuthStore } from '@/stores/auth'
import { useItineraryStore } from '@/stores/itinerary'
import { useTripStore } from '@/stores/trip'
import { useTheme } from '@/composables/useTheme'
import { useToast } from '@/composables/useToast'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { 
    ExclamationTriangleIcon,
    CalendarDaysIcon,
    CurrencyDollarIcon,
    SparklesIcon,
    UsersIcon
} from '@heroicons/vue/24/outline'

const { theme, toggleTheme } = useTheme()
const route = useRoute()

const tabs = [
  { name: '行程', icon: CalendarDaysIcon },
  { name: '費用', icon: CurrencyDollarIcon },
  { name: '願望清單', icon: SparklesIcon },
  { name: '成員', icon: UsersIcon }
]
const tripStore = useTripStore()
const itineraryStore = useItineraryStore()
const { currentTrip, loading, error } = storeToRefs(tripStore)
const { itineraries } = storeToRefs(itineraryStore)
const authStore = useAuthStore()
const tripId = route.params.id as string
const isInviteModalOpen = ref(false)
const isShareModalOpen = ref(false)

const { showToast } = useToast()

const isOrganizer = computed(() => {
  if (!currentTrip.value || !authStore.user) return false
  return currentTrip.value.trip_members?.some(
    (m: any) => m.user_id === authStore.user!.id && m.role === 'organizer'
  )
})

onMounted(async () => {
  await tripStore.fetchTripById(tripId)

  // Auto-join if user has no access but has an invite code
  const inviteCode = route.query.invite as string
  if (!currentTrip.value && inviteCode && authStore.user) {
    try {
      await tripStore.joinTrip(inviteCode, authStore.user.id)
      showToast('已成功加入行程！', 'success')
      // Retry fetching after joining
      await tripStore.fetchTripById(tripId)
    } catch (e: any) {
      if (e.message?.includes('already a member')) {
        await tripStore.fetchTripById(tripId)
      } else {
        showToast('無法加入行程：' + (e.message || '邀請碼無效'), 'error')
      }
    }
  }

  if (currentTrip.value) {
    await itineraryStore.fetchItineraries(tripId, currentTrip.value.start_date, currentTrip.value.end_date)
  }
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
