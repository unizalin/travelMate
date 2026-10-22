<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type WatchStopHandle } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildDailyTimeline,
  cloneJourney,
  loadLocalJourney,
  saveLocalJourney,
  timelineForParticipant,
  withTripId,
  type JourneyItem,
  type TripJourney,
} from '@/domain/tripJourney'
import { ICELAND_TRIP_ID } from '@/router/iceland'
import { tripOpeningDate } from '@/domain/tripOpeningDate'
import { publicIcelandJourney } from '@/data/icelandPublic'
const publicJourneyDraft: TripJourney = {
  ...publicIcelandJourney,
  members: Array.from({ length: 6 }, (_, index) => ({ id: `member-${index + 1}`, tripId: publicIcelandJourney.tripId, displayName: null, accountId: null })),
  items: publicIcelandJourney.items.map(item => ({ ...item, id: item.id.replace('public-', '') })),
}
import type { JourneyRoster as RosterState } from '@/services/journeyRosterService'
import { isOnlyLondonAddition } from '@/domain/londonJourney'
import ItineraryActivities from '@/components/trip/ItineraryActivities.vue'
import AddItineraryActivity from '@/components/trip/AddItineraryActivity.vue'
import MorningChecks from '@/components/trip/MorningChecks.vue'
import TripPreparation from '@/components/trip/TripPreparation.vue'
import { handbookDays } from '@/data/icelandHandbook'
import LondonPrelude from '@/components/trip/LondonPrelude.vue'
import { provideJourneyPhotos } from '@/services/journeyPhotoContext'
import SharedActivityMemo from '@/components/trip/SharedActivityMemo.vue'
import TripReader from '@/components/trip/TripReader.vue'
import ActivityComments from '@/components/trip/ActivityComments.vue'
import AuroraReminderSettings from '@/components/trip/AuroraReminderSettings.vue'
import AuroraConditions from '@/components/trip/AuroraConditions.vue'
import JourneyRoster from '@/components/trip/JourneyRoster.vue'
import PreparationChecklist from '@/components/preparation/PreparationChecklist.vue'

const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const showPublicReader = computed(() => configured && !cloudLoaded.value && !pendingEnvelope.value)
const route = useRoute()
const router = useRouter()
const defaultTripId = ICELAND_TRIP_ID
const routeTripId = computed(() => {
  const value = route.params.tripId
  return typeof value === 'string' && value.length > 0 ? value : defaultTripId
})
const activeTripId = ref(routeTripId.value)

const accountId = ref('local-preview')
const packingOwnerId = computed(() => accountId.value === 'local-preview' ? null : accountId.value)
const draft = ref<TripJourney>(withTripId(publicJourneyDraft, routeTripId.value))
const localSavedJson = ref(JSON.stringify(draft.value))
const cloudBaseJson = ref<string | null>(null)
const localDraftAvailable = ref(false)
const localPersistenceError = ref('')
const revision = ref<number | null>(null)
const cloudCanEdit = ref<boolean | null>(null)
const cloudLoaded = ref(false)
const cloudAuthReady = ref(false)
const photoContext = provideJourneyPhotos(activeTripId, accountId, cloudLoaded)
const localConflictKept = ref(false)
const busy = ref(false)
const statusMessage = ref('')
const errorMessage = ref('')
const journeyMissing = ref(false)
const selectedDate = ref('')
const activeSection = ref<'itinerary' | 'flights' | 'more'>('itinerary')
watch(() => route.query.section, section => {
  activeSection.value = section === 'flights' || section === 'more' ? section : 'itinerary'
}, { immediate: true })
const editMode = ref(false)
const tripToday = new Intl.DateTimeFormat('en-CA',{timeZone:'Atlantic/Reykjavik',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const showAurora = computed(() => tripToday >= '2026-10-30' && tripToday <= '2026-11-07')
const visibleItems = computed(() => draft.value.items.filter(item => item.date === selectedDate.value && !item.id.startsWith('london-') && item.status !== 'fallback').sort((a,b)=>a.order-b.order))
const fallbackItems = computed(() => draft.value.items.filter(item => item.date === selectedDate.value && !item.id.startsWith('london-') && item.status === 'fallback'))
const dayPlan = computed(() => draft.value.dayPlans?.[selectedDate.value] ?? handbookDays[selectedDate.value])
function editItem(id: string, patch: Partial<JourneyItem>) {
  if(!canEditDraft.value || !editMode.value) return
  const item=draft.value.items.find(item=>item.id===id)
  if(item) Object.assign(item,patch)
}
function reorderItems(items: JourneyItem[]) {
  if(!canEditDraft.value || !editMode.value) return
  items.forEach((item,index)=>editItem(item.id,{order:index+1}))
}
function addItem(date: string,name: string,location: string) {
  if(!canEditDraft.value || !editMode.value) return
  const london=date<'2026-10-30'
  draft.value.items.push({id:`${london?'london-':'activity-'}${crypto.randomUUID()}`,tripId:activeTripId.value,date,name,location:location||name,order:Math.max(0,...draft.value.items.filter(item=>item.date===date).map(item=>item.order))+1,plannedStart:null,plannedEnd:null,actualStart:null,actualEnd:null,status:'planned',participation:london?['member-2','member-3','member-4','member-5']:undefined})
}
function editPlan(field: 'keep'|'skip',value: string) {
  if(!canEditDraft.value || !editMode.value || !dayPlan.value) return
  draft.value.dayPlans ??= {}
  draft.value.dayPlans[selectedDate.value]={keep:dayPlan.value.keep,skip:dayPlan.value.skip,[field]:value}
}
function editLondonPlan(date: string, field: 'keep'|'skip', value: string) {
  if(!canEditDraft.value || !editMode.value) return
  const current = draft.value.dayPlans?.[date] ?? handbookDays[date]
  if(!current) return
  draft.value.dayPlans ??= {}
  draft.value.dayPlans[date]={keep:current.keep,skip:current.skip,[field]:value}
}

const flightRoster = ref<RosterState>({ claims: [], choices: [] })
const previewMemberId = ref('all')
const memoDrafts = reactive<Record<string, string>>({})
const serverMemoContentsJson = ref('{}')
type CloudEnvelope = { tripId?: string; revision: number; journey: TripJourney; canEdit: boolean; updatedAt?: string }
const pendingEnvelope = ref<CloudEnvelope | null>(null)

type JourneyOperationContext = {
  epoch: number
  accountId: string
  tripId: string
}

let journeyEpoch = 0
let stopAuthWatch: WatchStopHandle | undefined
let disposed = false

function invalidateJourneyOperations(): void {
  journeyEpoch += 1
  busy.value = false
}

function beginJourneyOperation(): JourneyOperationContext {
  journeyEpoch += 1
  return {
    epoch: journeyEpoch,
    accountId: accountId.value,
    tripId: activeTripId.value,
  }
}

function isCurrentJourneyOperation(operation: JourneyOperationContext): boolean {
  return operation.epoch === journeyEpoch && operation.accountId === accountId.value && operation.tripId === activeTripId.value
}

const timeline = computed(() => (previewMemberId.value === 'all'
  ? buildDailyTimeline(draft.value)
  : timelineForParticipant(draft.value, previewMemberId.value)).filter(day => day.events.length > 0))
const selectedDay = computed(() => timeline.value.find(day => day.date === selectedDate.value) ?? timeline.value[0] ?? null)
const currentDraftJson = computed(() => JSON.stringify(draft.value))
const isDirty = computed(() => currentDraftJson.value !== localSavedJson.value)
const hasCloudChanges = computed(() => cloudBaseJson.value === null
  ? localDraftAvailable.value || isDirty.value
  : currentDraftJson.value !== cloudBaseJson.value)
const canSaveCloud = computed(() => cloudLoaded.value && cloudCanEdit.value === true && revision.value !== null && !busy.value && !pendingEnvelope.value)
const canEditDraft = computed(() => !busy.value && !pendingEnvelope.value && cloudCanEdit.value !== false)
function serverMemoContents(): Record<string, string> {
  try {
    return JSON.parse(serverMemoContentsJson.value) as Record<string, string>
  } catch {
    return {}
  }
}

function memoDirty(activityId: string): boolean {
  return memoText(activityId) !== (serverMemoContents()[activityId] ?? '')
}
const hasUnsyncedMemo = computed(() => Object.keys(memoDrafts).some(activityId => memoDirty(activityId)))
function memoContents(journey: TripJourney): Record<string, string> {
  return Object.fromEntries(Object.entries(journey.memos ?? {}).map(([activityId, memo]) => [activityId, memo.content]))
}

function resetMemoDrafts(journey: TripJourney, syncServerContents = true): void {
  Object.keys(memoDrafts).forEach(key => delete memoDrafts[key])
  Object.assign(memoDrafts, memoContents(journey))
  if (syncServerContents) serverMemoContentsJson.value = JSON.stringify(memoContents(journey))
}

function memoText(activityId: string): string {
  return memoDrafts[activityId] ?? ''
}

watch(timeline, days => {
  if (!days.some(day => day.date === selectedDate.value)) selectedDate.value = tripOpeningDate(days.map(day => day.date))
}, { immediate: true })

watch(routeTripId, async nextTripId => {
  if (nextTripId === activeTripId.value) return

  invalidateJourneyOperations()
  activeTripId.value = nextTripId
  draft.value = withTripId(publicJourneyDraft, nextTripId)
  resetMemoDrafts(draft.value)
  localSavedJson.value = JSON.stringify(draft.value)
  cloudBaseJson.value = null
  localDraftAvailable.value = false
  localPersistenceError.value = ''
  revision.value = null
  cloudCanEdit.value = null
  cloudLoaded.value = false
  localConflictKept.value = false
  pendingEnvelope.value = null
  previewMemberId.value = 'all'
  selectedDate.value = ''
  statusMessage.value = ''
  errorMessage.value = ''
  journeyMissing.value = false
  loadScopedLocalDraft(accountId.value, nextTripId)

  if (cloudAuthReady.value) {
    await loadCloud()

  }
})

watch(draft, () => {
  errorMessage.value = ''
}, { deep: true })

function loadScopedLocalDraft(scopeAccountId: string, scopeTripId = routeTripId.value): void {
  try {
    const local = loadLocalJourney(scopeAccountId, scopeTripId)
    if (local) {
      draft.value = local
      resetMemoDrafts(local, false)
      localSavedJson.value = JSON.stringify(local)
      localDraftAvailable.value = true
      statusMessage.value = '已載入這個帳號的本機草稿。'
    }
  } catch {
    // An unavailable localStorage should not block the cloud controls.
  }
}

function switchAccount(nextAccountId: string): void {
  if (accountId.value === nextAccountId) return
  invalidateJourneyOperations()
  accountId.value = nextAccountId




  activeTripId.value = routeTripId.value
  draft.value = withTripId(publicJourneyDraft, routeTripId.value)
  resetMemoDrafts(draft.value)
  localSavedJson.value = JSON.stringify(draft.value)
  cloudBaseJson.value = null
  localDraftAvailable.value = false
  localPersistenceError.value = ''
  revision.value = null
  cloudCanEdit.value = null
  cloudLoaded.value = false
  localConflictKept.value = false
  pendingEnvelope.value = null
  previewMemberId.value = 'all'
  statusMessage.value = ''
  errorMessage.value = ''
  journeyMissing.value = false
  loadScopedLocalDraft(nextAccountId, routeTripId.value)
}

function updateFlightRoster(next: RosterState): void { flightRoster.value = next }

function normalizeJourneyForEditor(source: TripJourney): TripJourney {
  const next = cloneJourney(source)
  next.accommodations = next.accommodations.map(stay => ({
    ...stay,
    rooms: stay.rooms.map((room, index) => {
      const legacyRoom = room as typeof room & { memberIds?: string[]; occupantIds?: string[] }
      return {
        ...room,
        name: room.name || `房間 ${index + 1}`,
        participantIds: Array.isArray(room.participantIds)
          ? room.participantIds
          : legacyRoom.memberIds ?? legacyRoom.occupantIds ?? [],
      }
    }),
  }))
  return next
}

function localSave(): void {
  invalidateJourneyOperations()
  try {
    saveLocalJourney(accountId.value, draft.value)
    localSavedJson.value = JSON.stringify(draft.value)
    localDraftAvailable.value = true
    localPersistenceError.value = ''
    statusMessage.value = '本機草稿已儲存；只有這個帳號在這部裝置看得到。'
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '本機草稿儲存失敗。'
  }
}

function applyEnvelope(envelope: CloudEnvelope, preservedJourney?: TripJourney): void {
  const serverJourney = normalizeJourneyForEditor(envelope.journey)
  draft.value = preservedJourney ? normalizeJourneyForEditor(preservedJourney) : serverJourney
  resetMemoDrafts(draft.value)
  if (preservedJourney) serverMemoContentsJson.value = JSON.stringify(memoContents(serverJourney))
  activeTripId.value = envelope.tripId ?? envelope.journey.tripId
  revision.value = envelope.revision
  cloudCanEdit.value = envelope.canEdit
  cloudLoaded.value = true
  journeyMissing.value = false
  localConflictKept.value = false
  pendingEnvelope.value = null
  cloudBaseJson.value = JSON.stringify(serverJourney)

  try {
    saveLocalJourney(accountId.value, draft.value)
    localSavedJson.value = JSON.stringify(draft.value)
    localDraftAvailable.value = true
    localPersistenceError.value = ''
  } catch (error) {
    const reason = error instanceof Error ? error.message : '裝置儲存空間不可用'
    localPersistenceError.value = `雲端版本已採用，但本機副本儲存失敗：${reason}。重新開啟前請重試「儲存本機」。`
  }
}

function applyPendingCloud(): void {
  if (!pendingEnvelope.value) return
  invalidateJourneyOperations()
  applyEnvelope(pendingEnvelope.value)
  statusMessage.value = '已套用雲端版本；畫面中的本機變更已由雲端版本取代。'
}

function keepLocalDraft(): void {
  const envelope = pendingEnvelope.value
  if (!envelope) return
  invalidateJourneyOperations()
  activeTripId.value = envelope.tripId ?? envelope.journey.tripId
  revision.value = null
  cloudCanEdit.value = envelope.canEdit
  cloudLoaded.value = true
  localConflictKept.value = true
  statusMessage.value = '已保留本機變更；為避免覆蓋雲端版本，更新功能暫停。請先套用雲端版本，或另行整理後再儲存。'
}

async function loadCloud(): Promise<void> {
  const operation = beginJourneyOperation()
  const requestedTripId = activeTripId.value
  busy.value = true
  errorMessage.value = ''
  journeyMissing.value = false
  try {
    const service = await import('@/services/journeyService')
    if (!isCurrentJourneyOperation(operation)) return
    const envelope = await service.loadJourney(requestedTripId)
    if (!isCurrentJourneyOperation(operation)) return
    const cloudJson = JSON.stringify(normalizeJourneyForEditor(envelope.journey))
    if (hasCloudChanges.value && currentDraftJson.value !== cloudJson && !isOnlyLondonAddition(draft.value, normalizeJourneyForEditor(envelope.journey))) {
      pendingEnvelope.value = envelope
      localConflictKept.value = false
      statusMessage.value = '雲端版本已取得，但本機有未儲存變更；請選擇套用雲端或保留本機。'
    } else {
      operation.tripId = envelope.tripId ?? envelope.journey.tripId
      applyEnvelope(envelope)
      statusMessage.value = envelope.canEdit ? '已載入可編輯的雲端草稿。' : '已載入雲端草稿；目前帳號只有閱讀權限。'
    }
  } catch (error) {
    if (!isCurrentJourneyOperation(operation)) return
    if (error instanceof Error && 'code' in error && error.code === 'JOURNEY_NOT_FOUND') {
      journeyMissing.value = true
    } else {
      errorMessage.value = error instanceof Error ? error.message : '雲端草稿載入失敗；本機變更仍保留。'
    }
  } finally {
    if (isCurrentJourneyOperation(operation)) busy.value = false
  }
}

async function saveActivityMemo(activityId: string, content: string): Promise<void> {
  if (!canSaveCloud.value || revision.value === null || hasCloudChanges.value) {
    errorMessage.value = '請先儲存行程變更，再儲存 Memo。'; return
  }
  const operation = beginJourneyOperation(); busy.value = true; errorMessage.value = ''
  try {
    const service = await import('@/services/journeyService')
    const envelope = await service.saveJourneyMemo(activeTripId.value, revision.value, activityId, content)
    if (isCurrentJourneyOperation(operation)) applyEnvelope(envelope)
  } catch (cause) { if (isCurrentJourneyOperation(operation)) errorMessage.value = cause instanceof Error ? cause.message : 'Memo 儲存失敗，請重試。' }
  finally { if (isCurrentJourneyOperation(operation)) busy.value = false }
}

async function saveCloud(): Promise<void> {
  if (!canSaveCloud.value || revision.value === null) return
  const operation = beginJourneyOperation()
  const requestedTripId = activeTripId.value
  const expectedRevision = revision.value
  const journeySnapshot = cloneJourney(draft.value)
  busy.value = true
  errorMessage.value = ''
  try {
    const service = await import('@/services/journeyService')
    if (!isCurrentJourneyOperation(operation)) return
    const envelope = await service.saveJourney(requestedTripId, expectedRevision, journeySnapshot)
    if (!isCurrentJourneyOperation(operation)) return
    operation.tripId = envelope.tripId ?? envelope.journey.tripId
    applyEnvelope(envelope)
    if (!isCurrentJourneyOperation(operation)) return
    statusMessage.value = '雲端草稿已更新。'
  } catch (error) {
    if (!isCurrentJourneyOperation(operation)) return
    errorMessage.value = error instanceof Error ? `雲端儲存失敗：${error.message}；本機變更仍保留。` : '雲端儲存失敗；本機變更仍保留。'
  } finally {
    if (isCurrentJourneyOperation(operation)) busy.value = false
  }
}

onMounted(async () => {
  loadScopedLocalDraft(accountId.value)

  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    try {
      const { useAuthStore } = await import('@/stores/auth')
      if (disposed) return
      const authStore = useAuthStore()
      stopAuthWatch = watch(() => authStore.user?.id ?? null, userId => {
        switchAccount(userId ?? 'local-preview')
        if (cloudAuthReady.value && userId) void loadCloud()
      }, { immediate: true })
      if (!authStore.user) await authStore.initializeAuth()
      if (disposed) return
      cloudAuthReady.value = true
      if (authStore.user) {
        await loadCloud()

      }
    } catch {
      statusMessage.value = '目前以本機預覽模式開啟；雲端控制待登入後可用。'
    }
  }
})
onBeforeUnmount(() => {
  disposed = true
  stopAuthWatch?.()
  invalidateJourneyOperations()
})
</script>

<template>
  <TripReader v-if="showPublicReader" :section="activeSection" @select-section="router.replace({ query: { ...route.query, section: $event } })">
    <template #header-actions><slot name="account-actions" /></template>
  </TripReader>
  <TripReader v-else :journey="draft" :public-only="false" companion-mode :section="activeSection"
    @select-section="router.replace({ query: { ...route.query, section: $event } })"
    @select-date="selectedDate = $event">
    <template #prelude="{ date }"><LondonPrelude :date="date" embedded :journey="pendingEnvelope?.journey ?? draft" :editing="editMode" :can-edit="canEditDraft" :shared-ready="cloudLoaded || !!pendingEnvelope" :busy="busy" @toggle="editMode=!editMode" @edit-item="editItem" @edit-plan="editLondonPlan" @reorder="reorderItems" @add="addItem"><template #comments="{ item }"><SharedActivityMemo :activity-id="item.id" :memo="draft.memos?.[item.id]" :can-edit="cloudLoaded && cloudCanEdit === true" :busy="busy" @save="saveActivityMemo(item.id, $event)" /><ActivityComments :trip-id="activeTripId" :activity-id="item.id" :account-id="accountId" :can-post="(cloudLoaded && cloudCanEdit === true) || pendingEnvelope?.canEdit === true" /></template></LondonPrelude></template>
    <template #global-information><AuroraConditions v-if="showAurora" compact><template #reminders="{ cityId }"><AuroraReminderSettings :city-id="cityId" :account-id="accountId" /></template></AuroraConditions></template>
    <template #header-notice><p v-if="journeyMissing" role="status">此帳號尚無可存取的冰島雲端旅程；已有旅程時請建立者邀請你。</p><p v-else-if="errorMessage" role="alert">{{ errorMessage }}</p></template>
    <template #header-actions><slot name="account-actions" /><span class="journey-status rounded-full px-3 py-2 text-xs">{{ cloudCanEdit === false ? '目前僅可閱讀' : journeyMissing ? '尚無可存取旅程' : hasCloudChanges ? '有尚未儲存的變更' : cloudLoaded ? '已同步' : errorMessage ? '旅程載入失敗' : busy ? '正在載入旅程' : '尚未連接旅程' }}</span></template>
    <template #flights>
      <JourneyRoster :trip-id="activeTripId" :account-id="accountId" :can-edit="cloudCanEdit === true" :members="draft.members" @update="updateFlightRoster" />
    </template>
    <template #preparation>
      <slot name="management" />
      <section v-if="photoContext.preferences.value" class="my-4 rounded-xl border p-4 text-sm" aria-label="個人攝影偏好"><label><input type="checkbox" :checked="photoContext.preferences.value.showPhotography" :disabled="photoContext.busy.value" @change="photoContext.update({...photoContext.preferences.value,showPhotography:($event.target as HTMLInputElement).checked})" /> 顯示我的攝影建議</label><p v-if="photoContext.error.value" role="alert">{{photoContext.error.value}}</p></section>
      <TripPreparation :account-id="accountId" :trip-id="activeTripId" :journey="draft">
        <template #packing-list><PreparationChecklist :trip-id="activeTripId" :owner-id="packingOwnerId" :can-edit-shared="cloudCanEdit === true" embedded /></template>
      </TripPreparation>
    </template>
    <template #route-summary>
      <p v-if="selectedDay" class="route-line">{{ handbookDays[selectedDate]?.route ?? visibleItems.map(item => item.name).join(' → ') }}</p>
    </template>
    <template #day-practical>
      <div v-if="selectedDay" class="practical"><b>沿途實用</b> <span>{{ handbookDays[selectedDate]?.fuel }}</span> · <span>廁所：沿途休息站／遊客中心（開放待確認）</span> · <a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selectedDate==='2026-10-31'?'Grundarfjörður':selectedDate==='2026-11-05'?'Vík':visibleItems[0]?.location||'Reykjavík')+' petrol station')}`" target="_blank" rel="noreferrer">附近加油站 ↗</a> · <a href="https://umferdin.is/en" target="_blank" rel="noreferrer">今日路況・攝影機 ↗</a> · <a href="https://www.road.is/" target="_blank" rel="noreferrer">road.is ↗</a></div>
    </template>
    <template #daily-start><MorningChecks :date="selectedDate" :account-id="accountId" :trip-id="activeTripId" /></template>
    <template #day-content>
      <div v-if="selectedDay" class="compact-day">
        <div v-if="dayPlan" class="plan-b"><template v-if="editMode"><label>保住<input :value="dayPlan.keep" maxlength="2000" :disabled="!canEditDraft" @input="editPlan('keep',($event.target as HTMLInputElement).value)" /></label><label>先刪<input :value="dayPlan.skip" maxlength="2000" :disabled="!canEditDraft" @input="editPlan('skip',($event.target as HTMLInputElement).value)" /></label></template><template v-else><b>應變</b>　保住：{{ dayPlan.keep }} ｜ 先刪：{{ dayPlan.skip }}</template></div>
        <ItineraryActivities :items="visibleItems" :editing="editMode" :disabled="!canEditDraft" :today="selectedDate===tripToday" @edit="editItem" @reorder="reorderItems"><template #reminder="{ item }"><p v-if="/Ice Cave|Zodiac/.test(item.name)" class="notice-line">{{ /Zodiac/.test(item.name) ? '行程時段 11:20–13:20' : '行程時段 09:00–15:00' }}；集合／報到時間依票券核對。</p><p v-if="/Reynisfjara/.test(item.name)" class="notice-line">面向海、遵守警示燈與封閉線，保留退路。</p><p v-if="/Blue Lagoon/.test(item.name) && selectedDate==='2026-11-07'" class="notice-line">泡湯與當日航班時間衝突待確認，先保留機場緩衝。</p></template><template #comments="{ item }"><SharedActivityMemo :activity-id="item.id" :memo="draft.memos?.[item.id]" :can-edit="cloudLoaded && cloudCanEdit === true" :busy="busy" @save="saveActivityMemo(item.id, $event)" /><ActivityComments :trip-id="activeTripId" :activity-id="item.id" :account-id="accountId" :can-post="cloudLoaded && cloudCanEdit===true" /></template></ItineraryActivities>
        <section v-for="stay in draft.accommodations.filter(stay => stay.checkIn <= selectedDate && selectedDate < stay.checkOut)" :key="stay.id" class="compact-stay"><h3>今晚住宿</h3><p class="stay-name">{{ stay.name }}</p><p>入住時間待確認 · {{ stay.benefits.join(' · ') || '早餐、停車依訂單確認' }}</p></section>
        <AddItineraryActivity v-if="canEditDraft" :editing="editMode" :disabled="!canEditDraft" @start="editMode=true" @add="(name,location)=>addItem(selectedDate,name,location)" />
        <details v-if="fallbackItems.length" class="alternatives"><summary>備選景點與餐廳 <span class="disclosure-label" aria-hidden="true" /></summary><ItineraryActivities :items="fallbackItems" :editing="editMode" :disabled="!canEditDraft" @edit="editItem" @reorder="reorderItems"><template #comments="{ item }"><SharedActivityMemo :activity-id="item.id" :memo="draft.memos?.[item.id]" :can-edit="cloudLoaded && cloudCanEdit === true" :busy="busy" @save="saveActivityMemo(item.id, $event)" /><ActivityComments :trip-id="activeTripId" :activity-id="item.id" :account-id="accountId" :can-post="cloudLoaded && cloudCanEdit===true" /></template></ItineraryActivities></details>
      </div>
    </template>
    <template #daily-footer><footer v-if="canEditDraft" class="edit-footer"><button type="button" :disabled="!canEditDraft" @click="editMode=!editMode">{{ editMode ? '完成編輯' : '編輯行程' }}</button></footer></template>
    <template #sync-settings>
      <details class="mt-6 rounded-2xl border border-stone-200 bg-stone-50" :open="hasCloudChanges || !!pendingEnvelope || !!errorMessage || !!localPersistenceError">
        <summary class="cursor-pointer px-4 py-4 text-sm font-semibold text-stone-600">儲存與同步設定<span v-if="hasCloudChanges" class="ml-2 text-[var(--iceland-glacier)]">有變更待儲存</span></summary>
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(22,54,54,.06)] sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div>
          <p class="text-sm font-bold text-slate-900">{{ cloudLoaded ? '儲存到 TravelMate Supabase' : journeyMissing ? '尚無可存取的雲端旅程' : busy ? '連接旅程中' : '雲端旅程尚未連接' }}</p>
          <p class="mt-1 text-xs leading-5 text-slate-500">這是同一趟冰島旅程；儲存後，有編輯權限的人會看到更新。裝置也會保留備份。</p>
          <p v-if="statusMessage" class="mt-3 text-xs font-semibold text-[var(--iceland-glacier)]" role="status">{{ statusMessage }}</p>
          <p v-if="errorMessage" class="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold leading-5 text-rose-800" role="alert">{{ errorMessage }}</p>
          <p v-if="localPersistenceError" class="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900" role="alert">{{ localPersistenceError }}</p>
          <div v-if="pendingEnvelope" class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-950" role="alert">
            <p class="font-bold">本機與雲端都有變更</p>
            <p class="mt-1">{{ localConflictKept ? '本機草稿仍保留在畫面上；為避免以舊版本覆蓋雲端，請先套用雲端版本。' : '選擇版本後才會繼續雲端編輯；目前的本機草稿仍保留在畫面上。' }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button type="button" class="min-h-10 rounded-xl bg-amber-600 px-3 text-xs font-bold text-white" @click="applyPendingCloud">套用雲端版本</button>
              <button type="button" class="min-h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 disabled:cursor-not-allowed disabled:opacity-50" :disabled="localConflictKept" @click="keepLocalDraft">保留本機版本</button>
            </div>
          </div>
          <p v-if="cloudLoaded && cloudCanEdit === false" class="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">雲端目前只有閱讀權限；編輯控制已停用，但仍可另存本機草稿。</p>
        </div>
        <div class="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
          <button v-if="hasCloudChanges" type="button" class="min-h-11 rounded-2xl bg-[var(--iceland-action)] px-5 text-sm font-bold text-white disabled:opacity-45" :disabled="!canSaveCloud || !hasCloudChanges || hasUnsyncedMemo" @click="saveCloud">{{ busy ? '儲存中…' : '儲存變更' }}</button>
          <details class="relative text-xs text-slate-600">
            <summary class="flex min-h-11 cursor-pointer items-center rounded-2xl border border-slate-200 px-4 font-bold">同步選項</summary>
            <div class="absolute right-0 z-10 mt-2 flex min-w-40 flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
              <button type="button" class="text-left" @click="localSave">儲存裝置備份</button>
              <button type="button" class="text-left" :disabled="busy" @click="loadCloud">重新載入 Supabase</button>
            </div>
          </details>
        </div>
      </section>
      </details>
    </template>
  </TripReader>
</template>

<style scoped>.route-line,.practical{font-size:12px;line-height:1.7;color:#7a8783}.route-line{margin:0 0 4px}.practical{display:flex;flex-wrap:wrap;align-items:center;gap:6px;background:white;border:1px solid #dde3de;border-radius:9px;padding:6px 10px;margin:6px 0 0;line-height:1.55}.practical>b{color:#397d86;margin-right:4px}.practical a{color:#397d86;font-weight:600}.plan-b{font-size:12px;line-height:1.55;margin:8px 0 0;color:#7a8783}.plan-b b{color:#263331;margin-right:5px}.plan-b label{display:grid;gap:4px}.plan-b input{padding:8px;border:1px solid #ccd5cf;border-radius:8px;min-height:44px;background:white}.notice-line{font-size:12.5px;line-height:1.5;color:#8a4b28;background:#fdf3ec;border:1px solid #f0d9c8;padding:6px 9px;border-radius:9px;margin-top:7px}.compact-stay{background:white;border:1px solid #dde3de;border-radius:14px;padding:11px 13px;margin:14px 0 0}.compact-stay h3{font-size:13px;font-weight:600}.compact-stay .stay-name{font-size:13px;color:#263331}.compact-stay p{font-size:12px;line-height:1.7;color:#64726c;margin-top:3px}.edit-footer{display:flex;justify-content:center;margin:16px 0 4px}.edit-footer button{font-size:13px;color:#7a8783;border:1px solid #dde3de;background:white;border-radius:999px;padding:8px 20px;min-height:40px}.alternatives{margin-top:14px;border-top:1px solid #dde3de}.alternatives>summary{display:flex;justify-content:space-between;font-size:14px;font-weight:600;padding:12px 0 2px;cursor:pointer;list-style:none}.disclosure-label{font-size:12px;font-weight:400;color:#7a8783}.disclosure-label::after{content:"展開 ▾"}.alternatives[open] .disclosure-label::after{content:"收合 ▴"}.journey-status{padding:3px 9px;font-size:10px}</style>
