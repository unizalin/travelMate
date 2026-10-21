<template>
  <div class="min-h-screen bg-[#020617] mesh-gradient-dark text-white selection:bg-primary-500/30 font-sans transition-all duration-500 overflow-x-hidden">
    <!-- Orbital Decor -->
    <div class="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#3b82f633_0%,transparent_50%)]"></div>
        <div class="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]"></div>
    </div>

    <!-- Glass Header -->
    <header class="sticky top-0 z-50 p-6 md:p-8">
        <div class="mx-auto max-w-[1600px]">
            <div class="bg-secondary-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] px-8 py-4 flex justify-between items-center shadow-2xl ring-1 ring-white/5 transition-all">
                <div class="flex items-center gap-6">
                    <router-link to="/trips" class="flex items-center gap-4 group active:scale-95 transition-transform">
                        <div class="p-2.5 bg-white/5 rounded-xl border border-white/10 shadow-lg group-hover:bg-primary-600 group-hover:border-primary-500 transition-all">
                            <ChevronLeftIcon class="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">行程管理</span>
                            <span v-if="currentTrip" class="text-lg font-black tracking-tighter text-white group-hover:text-primary-400 transition-colors uppercase">{{ currentTrip.name }}</span>
                        </div>
                    </router-link>
                </div>

                <div class="flex items-center gap-6">
                    <div class="hidden md:flex items-center gap-3 px-6 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span class="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em]">系統狀態：運作中</span>
                    </div>

                    <div class="flex items-center gap-4">
                        <button @click="isShareModalOpen = true"
                            class="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-black uppercase tracking-[0.4em] transition-all text-white/50 hover:text-white">
                            <ShareIcon class="w-4 h-4" />
                            Share
                        </button>
                        <UserMenu class="text-white" />
                    </div>
                </div>
            </div>
        </div>
    </header>

    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[70vh] relative z-10 transition-all gap-8">
        <div class="relative w-28 h-28">
            <div class="absolute inset-0 border-4 border-primary-500/10 rounded-full"></div>
            <div class="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <div class="absolute inset-5 border-4 border-white/5 border-b-transparent rounded-full animate-spin-reverse"></div>
        </div>
        <p class="text-[10px] font-black uppercase tracking-[0.8em] animate-pulse text-primary-400">正在讀取行程詳情...</p>
    </div>

    <div v-else-if="error" class="max-w-xl mx-auto text-center py-40 relative z-10 px-8 transition-all">
        <div class="mx-auto w-24 h-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center mb-10 text-rose-500 shadow-inner group transition-colors ring-1 ring-rose-500/20">
            <ExclamationTriangleIcon class="w-12 h-12 group-hover:scale-110 transition-transform" />
        </div>
        <h3 class="text-3xl font-black mb-4 text-white uppercase tracking-tighter">系統連接失敗</h3>
        <p class="text-sm font-bold mb-12 leading-relaxed text-white/30 px-8">{{ error }}</p>
        <button 
            @click="tripStore.fetchTripById(tripId)"
            class="w-full py-6 rounded-3xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.5em] shadow-2xl hover:bg-rose-600 transition-all active:scale-95"
        >
            重新連接
        </button>
    </div>

    <div v-else-if="!currentTrip && !loading" class="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center relative z-10">
      <div class="mb-12 w-32 h-32 flex items-center justify-center rounded-[3.5rem] bg-secondary-900/40 border border-white/10 shadow-2xl relative transition-all overflow-hidden ring-1 ring-white/5">
        <span class="text-6xl z-10">🔒</span>
        <div class="absolute inset-0 bg-primary-500/10 blur-[80px] rounded-full"></div>
      </div>
      <h2 class="text-4xl font-black mb-6 text-white uppercase tracking-tighter">存取權限受限</h2>
      <p class="max-w-md mb-12 leading-relaxed font-bold text-white/30 text-lg">
        您目前的帳號尚未獲得此行程的存取授權。請確認您的邀請連結或聯繫行程管理員。
      </p>
      <router-link 
        to="/trips"
        class="px-12 py-5 rounded-3xl bg-white text-secondary-900 text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-primary-500 hover:text-white transition-all active:scale-95"
      >
        返回行程列表
      </router-link>
    </div>

    <div v-else-if="currentTrip" class="relative z-10">
      <!-- Main Content / Tabs Area -->
      <main class="mx-auto max-w-[1700px] px-6 pb-24">
        <TabGroup>
          <div class="flex flex-col lg:flex-row gap-12">
            <!-- Sidebar Navigation -->
            <aside class="w-full lg:w-80 shrink-0 space-y-10">
                <TabList class="flex lg:flex-col items-center lg:items-stretch gap-2 p-2 bg-secondary-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-x-auto lg:overflow-x-visible no-scrollbar transition-all ring-1 ring-white/5">
                  <Tab
                    v-for="tab in tabs"
                    :key="tab.name"
                    v-slot="{ selected }"
                    as="template"
                  >
                    <button
                      :class="[
                        'px-8 py-5 text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 rounded-3xl outline-none focus:ring-0 whitespace-nowrap lg:whitespace-normal group',
                        selected
                          ? 'bg-white text-secondary-900 shadow-2xl transform scale-[1.05] z-10'
                          : 'text-white/30 hover:text-white hover:bg-white/5'
                      ]"
                    >
                      <div class="flex items-center lg:justify-start gap-4">
                        <component :is="tab.icon" class="w-4 h-4 transition-transform group-hover:scale-125" :class="selected ? 'text-primary-600' : ''" />
                        <span>{{ tab.name }}</span>
                      </div>
                    </button>
                  </Tab>
                </TabList>

                <!-- Mission Analytics HUD -->
                <div class="hidden lg:block space-y-8 animate-fade-in-up">
                    <div class="p-8 bg-secondary-900/40 border border-white/10 rounded-[3.5rem] backdrop-blur-3xl shadow-2xl ring-1 ring-white/5 space-y-8">
                        <div class="flex items-center justify-between">
                            <h4 class="text-[10px] font-black uppercase tracking-[0.5em] text-primary-400 flex items-center gap-3">
                                <div class="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                                數據概覽
                            </h4>
                            <div class="text-[8px] font-black text-white/10 uppercase tracking-widest">v1.2</div>
                        </div>
                        
                        <div class="grid grid-cols-1 gap-6">
                            <!-- Stat: Days -->
                            <div class="group/stat p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-primary-500/30 transition-all hover:bg-white/10 shadow-lg">
                                <div class="flex items-center gap-4 mb-4">
                                    <div class="p-3 bg-secondary-900 rounded-2xl shadow-2xl text-primary-400 ring-1 ring-white/5">
                                        <CalendarDaysIcon class="w-5 h-5" />
                                    </div>
                                    <span class="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">旅程天數</span>
                                </div>
                                <div class="flex items-baseline gap-2">
                                    <span class="text-3xl font-black text-white tabular-nums tracking-tighter">{{ itineraries.length }}</span>
                                    <span class="text-[10px] font-black text-white/20 uppercase tracking-widest">天數</span>
                                </div>
                            </div>

                            <!-- Stat: Points -->
                            <div class="group/stat p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-emerald-500/30 transition-all hover:bg-white/10 shadow-lg">
                                <div class="flex items-center gap-4 mb-4">
                                    <div class="p-3 bg-secondary-900 rounded-2xl shadow-2xl text-emerald-400 ring-1 ring-white/5">
                                        <MapPinIcon class="w-5 h-5" />
                                    </div>
                                    <span class="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">景點統計</span>
                                </div>
                                <div class="flex items-baseline gap-2">
                                    <span class="text-3xl font-black text-white tabular-nums tracking-tighter">{{ totalActivities }}</span>
                                    <span class="text-[10px] font-black text-white/20 uppercase tracking-widest">個景點</span>
                                </div>
                            </div>

                            <!-- Stat: Personnel -->
                            <div class="group/stat p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-purple-500/30 transition-all hover:bg-white/10 shadow-lg">
                                <div class="flex items-center gap-4 mb-4">
                                    <div class="p-3 bg-secondary-900 rounded-2xl shadow-2xl text-purple-400 ring-1 ring-white/5">
                                        <UsersIcon class="w-5 h-5" />
                                    </div>
                                    <span class="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">參與成員</span>
                                </div>
                                <div class="flex items-baseline gap-2">
                                    <span class="text-3xl font-black text-white tabular-nums tracking-tighter">{{ currentTrip.trip_members?.length || 0 }}</span>
                                    <span class="text-[10px] font-black text-white/20 uppercase tracking-widest">位成員</span>
                                </div>
                            </div>
                        </div>

                        <!-- Management Protocol -->
                        <div v-if="isOrganizer" class="pt-8 border-t border-white/10">
                            <h5 class="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-6 px-1">管理權限</h5>
                            <div class="p-6 bg-primary-500/10 border border-primary-500/20 rounded-[2rem] group hover:bg-primary-500/20 transition-all cursor-pointer" @click="copyInviteCode">
                                <span class="text-[8px] font-black uppercase tracking-[0.5em] text-primary-400 mb-2 block">專屬邀請碼</span>
                                <div class="font-mono text-lg text-white flex items-center justify-between font-bold">
                                    <span>{{ currentTrip.invite_code }}</span>
                                    <div class="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-primary-500 transition-all shadow-xl">
                                        <DocumentDuplicateIcon class="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- Main Content Panels -->
            <div class="flex-1 min-w-0">
                <TabPanels>
                    <TabPanel v-for="tab in tabs" :key="tab.name" class="outline-none focus:ring-0">
                        <ItineraryView v-if="tab.name === '行程'" class="animate-fade-in" />
                        <div v-else-if="tab.name === '費用'" class="bg-secondary-900/40 backdrop-blur-3xl border border-white/5 rounded-[4rem] p-10 md:p-14 min-h-[600px] shadow-[0_50px_100px_rgba(0,0,0,0.5)] transition-all ring-1 ring-white/5 animate-fade-in">
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
                            class="animate-fade-in"
                        />
                        <div v-else-if="tab.name === '成員'" class="space-y-12 animate-fade-in">
                            <div class="bg-secondary-900/40 backdrop-blur-3xl border border-white/5 rounded-[4rem] p-12 md:p-16 shadow-[0_50px_100px_rgba(0,0,0,0.5)] transition-all ring-1 ring-white/5">
                                <div class="flex items-center justify-between mb-12">
                                    <h3 class="text-4xl font-black flex items-center gap-6 text-white uppercase tracking-tighter">
                                        <div class="w-1.5 h-12 bg-primary-500 rounded-full"></div>
                                        行程參與成員
                                    </h3>
                                    <button @click="isInviteModalOpen = true" v-if="isOrganizer" class="px-8 py-4 rounded-2xl bg-white text-secondary-900 text-[9px] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-primary-500 hover:text-white transition-all">
                                        新增成員
                                    </button>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    <div v-for="member in currentTrip.trip_members" :key="member.id" 
                                        class="flex items-center gap-6 p-6 bg-white/5 border border-white/5 rounded-[2.5rem] hover:bg-white/10 hover:border-primary-500/30 transition-all group scale-100 hover:scale-[1.02] shadow-xl">
                                    <img class="h-16 w-16 rounded-[1.5rem] border-2 border-white/5 group-hover:border-primary-500 transition-all duration-500 bg-white/5 shadow-2xl"
                                        :src="member.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + member.user_id" />
                                    <div class="min-w-0">
                                        <p class="text-lg font-black text-white truncate uppercase tracking-tight">{{ member.profiles?.display_name || 'Classified Unit' }}</p>
                                        <div class="flex items-center gap-2 mt-1">
                                            <div class="w-1 h-1 rounded-full" :class="member.role === 'organizer' ? 'bg-primary-500' : 'bg-white/20'"></div>
                                            <p class="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">{{ member.role }}</p>
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Preparation Checklist -->
                            <div class="bg-secondary-900/40 backdrop-blur-3xl border border-white/5 rounded-[4rem] p-12 md:p-16 shadow-[0_50px_100px_rgba(0,0,0,0.5)] transition-all ring-1 ring-white/5">
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
import UserMenu from '@/components/common/UserMenu.vue'
import ItineraryView from '@/views/Itinerary.vue'
import ExpenseView from '@/components/trip/ExpenseView.vue'
import CandidateActivitiesView from '@/views/CandidateActivitiesView.vue'
import PreparationChecklist from '@/components/preparation/PreparationChecklist.vue'
import { useAuthStore } from '@/stores/auth'
import { useItineraryStore } from '@/stores/itinerary'
import { useTripStore } from '@/stores/trip'
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
    UsersIcon,
    MapPinIcon,
    ChevronLeftIcon,
    ShareIcon,
    DocumentDuplicateIcon
} from '@heroicons/vue/24/outline'

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

const totalActivities = computed(() => {
    return itineraries.value.reduce((total, it) => total + (it.activities?.length || 0), 0)
})

function copyInviteCode() {
    if (currentTrip.value?.invite_code) {
        navigator.clipboard.writeText(currentTrip.value.invite_code)
        showToast('邀請碼已複製到剪貼簿', 'success')
    }
}

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
