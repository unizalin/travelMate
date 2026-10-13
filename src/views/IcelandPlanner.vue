<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildDailyTimeline,
  cloneJourney,
  loadLocalJourney,
  saveLocalJourney,
  timelineForParticipant,
  withTripId,
  type JourneyAccommodation,
  type JourneyGroup,
  type JourneyMember,
  type JourneyStatus,
  type JourneyTransport,
  type TripJourney,
} from '@/domain/tripJourney'
import { icelandJourney } from '@/data/icelandJourney'

const route = useRoute()
const router = useRouter()
const defaultTripId = icelandJourney.tripId
const routeTripId = computed(() => {
  const value = route.params.tripId
  return typeof value === 'string' && value.length > 0 ? value : defaultTripId
})
const activeTripId = ref(routeTripId.value)

const accountId = ref('local-preview')
const draft = ref<TripJourney>(withTripId(icelandJourney, routeTripId.value))
const localSavedJson = ref(JSON.stringify(draft.value))
const cloudBaseJson = ref<string | null>(null)
const localDraftAvailable = ref(false)
const localPersistenceError = ref('')
const revision = ref<number | null>(null)
const cloudCanEdit = ref<boolean | null>(null)
const cloudLoaded = ref(false)
const cloudAuthReady = ref(false)
const localConflictKept = ref(false)
const busy = ref(false)
const statusMessage = ref('')
const errorMessage = ref('')
const selectedDate = ref('')
const previewMemberId = ref('all')
const benefitInputs = reactive<Record<string, string>>({})

type CloudEnvelope = { tripId?: string; revision: number; journey: TripJourney; canEdit: boolean; updatedAt?: string }
const pendingEnvelope = ref<CloudEnvelope | null>(null)

type JourneyOperationContext = {
  epoch: number
  accountId: string
  tripId: string
}

let journeyEpoch = 0

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
const editingLocked = computed(() => busy.value || (cloudLoaded.value && cloudCanEdit.value === false))
const canSaveCloud = computed(() => cloudLoaded.value && cloudCanEdit.value === true && revision.value !== null && !busy.value && !pendingEnvelope.value)
const localStatusLabel = computed(() => {
  if (localPersistenceError.value) return '副本尚未保存'
  if (hasCloudChanges.value) return isDirty.value ? '有未同步變更' : '本機草稿待同步'
  if (cloudLoaded.value) return '已同步'
  if (isDirty.value) return '有未儲存變更'
  if (localDraftAvailable.value) return '本機草稿待載入雲端'
  return '尚未載入雲端'
})
const cloudLabel = computed(() => {
  if (localConflictKept.value) return '雲端：本機待整理'
  if (pendingEnvelope.value) return '雲端：等待版本選擇'
  if (cloudCanEdit.value === false) return '雲端：僅可讀'
  if (cloudLoaded.value && cloudCanEdit.value === true) return '雲端：可編輯'
  return '雲端：尚未連線'
})

const transportDraft = reactive<{
  kind: JourneyTransport['kind']
  name: string
  departure: JourneyTransport['departure']
  arrival: JourneyTransport['arrival']
  participantIds: string[]
}>({
  kind: 'car',
  name: '',
  departure: { location: '', localDate: '2026-10-30', localTime: null, timeZone: icelandJourney.timeZone },
  arrival: { location: '', localDate: '2026-10-30', localTime: null, timeZone: icelandJourney.timeZone },
  participantIds: [],
})

const statusOptions: Array<{ value: JourneyStatus; label: string }> = [
  { value: 'planned', label: '規劃中' },
  { value: 'next', label: '下一站' },
  { value: 'completed', label: '已完成' },
  { value: 'fallback', label: '備案' },
  { value: 'skipped', label: '略過' },
  { value: 'cancelled', label: '已取消' },
]

watch(timeline, days => {
  if (!days.some(day => day.date === selectedDate.value)) selectedDate.value = days[0]?.date ?? ''
}, { immediate: true })

watch(routeTripId, async nextTripId => {
  if (nextTripId === activeTripId.value) return

  invalidateJourneyOperations()
  activeTripId.value = nextTripId
  draft.value = withTripId(icelandJourney, nextTripId)
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
  Object.keys(benefitInputs).forEach(key => delete benefitInputs[key])
  statusMessage.value = ''
  errorMessage.value = ''
  loadScopedLocalDraft(accountId.value, nextTripId)

  if (cloudAuthReady.value) await loadCloud()
})

watch(draft, () => {
  errorMessage.value = ''
}, { deep: true })

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function loadScopedLocalDraft(scopeAccountId: string, scopeTripId = routeTripId.value): void {
  try {
    const local = loadLocalJourney(scopeAccountId, scopeTripId)
    if (local) {
      draft.value = local
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
  draft.value = withTripId(icelandJourney, routeTripId.value)
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
  Object.keys(benefitInputs).forEach(key => delete benefitInputs[key])
  statusMessage.value = ''
  errorMessage.value = ''
  loadScopedLocalDraft(nextAccountId, routeTripId.value)
}

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

function dayLabel(date: string): string {
  return new Intl.DateTimeFormat('zh-TW', { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

function memberLabel(member: JourneyMember): string {
  const index = draft.value.members.indexOf(member)
  return member.displayName?.trim() || `成員 ${index + 1}`
}

function setGroupMembers(group: JourneyGroup, memberId: string, checked: boolean): void {
  group.memberIds = checked
    ? [...new Set([...group.memberIds, memberId])]
    : group.memberIds.filter(id => id !== memberId)
}

function setParticipants(target: { participantIds: string[] }, memberId: string, checked: boolean): void {
  target.participantIds = checked
    ? [...new Set([...target.participantIds, memberId])]
    : target.participantIds.filter(id => id !== memberId)
}

function addGroup(): void {
  draft.value.groups.push({
    id: createId('group'),
    tripId: draft.value.tripId,
    name: `群組 ${draft.value.groups.length + 1}`,
    memberIds: [],
    membershipConfirmed: false,
  })
}

function removeGroup(groupId: string): void {
  draft.value.groups = draft.value.groups.filter(group => group.id !== groupId)
}

function addTransport(): void {
  if (!transportDraft.name.trim() || !transportDraft.departure.location.trim() || !transportDraft.arrival.location.trim()) {
    errorMessage.value = '請先填入交通名稱、出發地與抵達地。'
    return
  }
  draft.value.transports.push({
    id: createId('transport'),
    tripId: draft.value.tripId,
    kind: transportDraft.kind,
    name: transportDraft.name.trim(),
    departure: { ...transportDraft.departure },
    arrival: { ...transportDraft.arrival },
    participantIds: [...transportDraft.participantIds],
    status: 'planned',
    actualStart: null,
    actualEnd: null,
  })
  transportDraft.name = ''
  transportDraft.departure.location = ''
  transportDraft.arrival.location = ''
  transportDraft.participantIds = []
  statusMessage.value = '交通已加入本機草稿。'
}

function removeTransport(transportId: string): void {
  draft.value.transports = draft.value.transports.filter(transport => transport.id !== transportId)
}

function addAccommodation(): void {
  const index = draft.value.accommodations.length + 1
  const stay: JourneyAccommodation = {
    id: createId('stay'),
    tripId: draft.value.tripId,
    name: `住宿 ${index}`,
    checkIn: '2026-11-01',
    checkOut: '2026-11-02',
    participantIds: [],
    rooms: [],
    benefits: [],
  }
  draft.value.accommodations.push(stay)
}

function removeAccommodation(stayId: string): void {
  draft.value.accommodations = draft.value.accommodations.filter(stay => stay.id !== stayId)
  delete benefitInputs[stayId]
}

function addRoom(stay: JourneyAccommodation): void {
  stay.rooms.push({ id: createId('room'), name: `房間 ${stay.rooms.length + 1}`, participantIds: [] })
}

function removeRoom(stay: JourneyAccommodation, roomId: string): void {
  stay.rooms = stay.rooms.filter(room => room.id !== roomId)
}

function benefitsText(stay: JourneyAccommodation): string {
  if (benefitInputs[stay.id] === undefined) benefitInputs[stay.id] = stay.benefits.join('、')
  return benefitInputs[stay.id]
}

function updateBenefits(stay: JourneyAccommodation, value: string): void {
  benefitInputs[stay.id] = value
  stay.benefits = value.split(/[、,，]/).map(item => item.trim()).filter(Boolean)
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

function applyEnvelope(envelope: CloudEnvelope): void {
  draft.value = normalizeJourneyForEditor(envelope.journey)
  activeTripId.value = envelope.tripId ?? envelope.journey.tripId
  revision.value = envelope.revision
  cloudCanEdit.value = envelope.canEdit
  cloudLoaded.value = true
  localConflictKept.value = false
  pendingEnvelope.value = null
  cloudBaseJson.value = JSON.stringify(draft.value)
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
  try {
    const service = await import('@/services/journeyService')
    if (!isCurrentJourneyOperation(operation)) return
    const envelope = await service.loadJourney(requestedTripId)
    if (!isCurrentJourneyOperation(operation)) return
    const cloudJson = JSON.stringify(normalizeJourneyForEditor(envelope.journey))
    if (hasCloudChanges.value && currentDraftJson.value !== cloudJson) {
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
    errorMessage.value = error instanceof Error ? error.message : '雲端草稿載入失敗；本機變更仍保留。'
  } finally {
    if (isCurrentJourneyOperation(operation)) busy.value = false
  }
}

async function createCloud(): Promise<void> {
  const operation = beginJourneyOperation()
  const journeySnapshot = cloneJourney(draft.value)
  busy.value = true
  errorMessage.value = ''
  try {
    const service = await import('@/services/journeyService')
    if (!isCurrentJourneyOperation(operation)) return
    const envelope = await service.createJourney(journeySnapshot)
    if (!isCurrentJourneyOperation(operation)) return
    operation.tripId = envelope.tripId ?? envelope.journey.tripId
    applyEnvelope(envelope)
    if (!isCurrentJourneyOperation(operation)) return
    if (routeTripId.value !== operation.tripId) {
      await router.replace({ name: 'iceland-planner', params: { tripId: operation.tripId } })
    }
    if (!isCurrentJourneyOperation(operation)) return
    statusMessage.value = '雲端草稿已建立。'
  } catch (error) {
    if (!isCurrentJourneyOperation(operation)) return
    errorMessage.value = error instanceof Error ? error.message : '雲端草稿建立失敗；本機變更仍保留。'
  } finally {
    if (isCurrentJourneyOperation(operation)) busy.value = false
  }
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
      const authStore = useAuthStore()
      watch(() => authStore.user?.id ?? null, userId => {
        switchAccount(userId ?? 'local-preview')
        if (cloudAuthReady.value && userId) void loadCloud()
      }, { immediate: true })
      if (!authStore.user) await authStore.initializeAuth()
      cloudAuthReady.value = true
      if (authStore.user) await loadCloud()
    } catch {
      statusMessage.value = '目前以本機預覽模式開啟；雲端控制待登入後可用。'
    }
  }
})
</script>

<template>
  <main class="min-h-screen bg-[#f5f8f7] pb-28 text-slate-900">
    <header class="bg-[#0d3031] text-white">
      <div class="mx-auto max-w-6xl px-5 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8">
        <div class="flex items-center justify-between gap-3 text-xs font-semibold tracking-[.18em] text-teal-100/75">
          <button type="button" class="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[.16em] transition hover:bg-white/10" @click="router.push('/share/iceland')">← 閱讀行程</button>
          <span>PRIVATE PLANNING</span>
        </div>
        <div class="mt-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p class="text-sm text-amber-100/85">Iceland 2026 · {{ draft.timeZone }}</p>
            <h1 class="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">一起把行程排好</h1>
            <p class="mt-3 max-w-xl text-sm leading-6 text-teal-50/75">成員名稱、群組、乘客與房間只留在私人規劃。尚未確認的資訊會保留為空白，避免替旅伴做決定。</p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs font-semibold">
            <span class="rounded-full border border-white/15 bg-white/[.08] px-3 py-2">本機：{{ localStatusLabel }}</span>
            <span class="rounded-full border border-white/15 bg-white/[.08] px-3 py-2">{{ cloudLabel }}</span>
          </div>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-6xl space-y-8 px-5 pt-6 sm:px-8 sm:pt-10">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(22,54,54,.06)] sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div>
          <p class="text-sm font-bold text-slate-900">草稿控制</p>
          <p class="mt-1 text-xs leading-5 text-slate-500">本機草稿按帳號與旅程分開保存；雲端儲存使用版本號保護彼此的變更。</p>
          <p v-if="statusMessage" class="mt-3 text-xs font-semibold text-teal-700" role="status">{{ statusMessage }}</p>
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
        <div class="mt-4 grid grid-cols-2 gap-2 sm:mt-0 sm:flex sm:flex-wrap sm:justify-end">
          <button type="button" class="min-h-11 rounded-2xl bg-teal-900 px-4 text-xs font-bold text-white transition hover:bg-teal-800" @click="localSave">儲存本機</button>
          <button type="button" class="min-h-11 rounded-2xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition hover:border-teal-300" :disabled="busy" @click="loadCloud">載入雲端</button>
          <button type="button" class="min-h-11 rounded-2xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-50" :disabled="busy || cloudLoaded || !!pendingEnvelope" @click="createCloud">建立雲端</button>
          <button type="button" class="min-h-11 rounded-2xl bg-amber-500 px-4 text-xs font-bold text-amber-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-45" :disabled="!canSaveCloud" @click="saveCloud">更新雲端</button>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(22,54,54,.06)] sm:p-6" aria-labelledby="roster-heading">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[.2em] text-teal-700">Roster / six slots</p>
            <h2 id="roster-heading" class="mt-1 text-2xl font-black tracking-tight">旅伴名單</h2>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">帳號綁定待確認</span>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label v-for="(member, index) in draft.members" :key="member.id" class="rounded-2xl border border-slate-200 p-4">
            <span class="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Member {{ index + 1 }}</span>
            <input v-model="member.displayName" type="text" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-teal-500 focus:bg-white" :aria-label="`成員 ${index + 1} 名稱`" :disabled="editingLocked" />
            <span class="mt-2 block text-[11px] text-slate-400">未綁定帳號 · 不會出現在公開閱讀</span>
          </label>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(22,54,54,.06)] sm:p-6" aria-labelledby="groups-heading">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[.2em] text-indigo-700">Groups / overlap allowed</p>
            <h2 id="groups-heading" class="mt-1 text-2xl font-black tracking-tight">分組</h2>
          </div>
          <button type="button" class="min-h-10 rounded-xl border border-indigo-200 px-3 text-xs font-bold text-indigo-800 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50" :disabled="editingLocked" @click="addGroup">＋ 新增群組</button>
        </div>
        <div class="mt-5 grid gap-3 lg:grid-cols-3">
          <article v-for="group in draft.groups" :key="group.id" class="rounded-2xl border border-slate-200 p-4">
            <div class="flex items-center gap-2">
              <input v-model="group.name" type="text" class="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white" aria-label="群組名稱" :disabled="editingLocked" />
              <button type="button" class="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label="刪除群組" :disabled="editingLocked" @click="removeGroup(group.id)">×</button>
            </div>
            <label class="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <input v-model="group.membershipConfirmed" type="checkbox" class="h-4 w-4 accent-indigo-700" :disabled="editingLocked" /> 已確認成員
            </label>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <label v-for="member in draft.members" :key="member.id" class="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" class="h-4 w-4 accent-indigo-700" :checked="group.memberIds.includes(member.id)" :disabled="editingLocked" @change="setGroupMembers(group, member.id, ($event.target as HTMLInputElement).checked)" />
                <span class="truncate">{{ memberLabel(member) }}</span>
              </label>
            </div>
          </article>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(22,54,54,.06)] sm:p-6" aria-labelledby="preview-heading">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <p class="text-[11px] font-bold uppercase tracking-[.2em] text-teal-700">Preview / one shared itinerary</p>
          <h2 id="preview-heading" class="mt-1 text-2xl font-black tracking-tight">每日預覽</h2>
          </div>
          <label class="text-xs font-semibold text-slate-500">查看參與者
            <select v-model="previewMemberId" class="ml-2 min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700">
              <option value="all">全部共享行程</option>
              <option v-for="member in draft.members" :key="member.id" :value="member.id">{{ memberLabel(member) }}</option>
            </select>
          </label>
        </div>
        <div class="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button v-for="day in timeline" :key="day.date" type="button" class="min-w-[110px] rounded-2xl border px-3 py-3 text-left" :class="selectedDay?.date === day.date ? 'border-teal-800 bg-teal-800 text-white' : 'border-slate-200 text-slate-600'" @click="selectedDate = day.date">
            <span class="block text-[10px] font-bold uppercase tracking-[.16em] opacity-65">Day {{ timeline.indexOf(day) + 1 }}</span>
            <span class="mt-1 block text-sm font-bold">{{ dayLabel(day.date) }}</span>
          </button>
        </div>
        <div v-if="selectedDay" class="mt-4 space-y-2">
          <div v-for="event in selectedDay.events" :key="event.id" class="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <span class="h-2 w-2 shrink-0 rounded-full" :class="event.type === 'transport' ? 'bg-amber-500' : event.type === 'accommodation' ? 'bg-indigo-500' : 'bg-teal-500'"></span>
            <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ event.name }}</span>
            <span class="shrink-0 text-xs text-slate-400">{{ event.pendingParticipation ? '待確認' : event.type === 'transport' ? '交通' : event.type === 'accommodation' ? '住宿' : '行程' }}</span>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(22,54,54,.06)] sm:p-6" aria-labelledby="transport-heading">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[.2em] text-amber-700">Transport / seven kinds</p>
            <h2 id="transport-heading" class="mt-1 text-2xl font-black tracking-tight">交通與乘客</h2>
          </div>
          <span class="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-800">乘客可留空</span>
        </div>
        <div class="mt-5 space-y-4">
          <article v-for="transport in draft.transports" :key="transport.id" class="rounded-2xl border border-slate-200 p-4">
            <div class="grid gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-center">
              <select v-model="transport.kind" class="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-amber-400" :disabled="editingLocked">
                <option v-for="kind in ['flight', 'train', 'bus', 'car', 'ferry', 'transfer', 'other']" :key="kind" :value="kind">{{ kind }}</option>
              </select>
              <input v-model="transport.name" type="text" class="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-amber-400" placeholder="交通名稱，例如 BA802" :disabled="editingLocked" />
              <button type="button" class="min-h-11 rounded-xl px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50" :disabled="editingLocked" @click="removeTransport(transport.id)">刪除</button>
            </div>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl bg-slate-50 p-3">
                <p class="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">出發</p>
                <div class="mt-2 grid grid-cols-2 gap-2">
                  <input v-model="transport.departure.location" type="text" class="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" placeholder="地點" :disabled="editingLocked" />
                  <input v-model="transport.departure.localDate" type="date" class="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" :disabled="editingLocked" />
                  <input v-model="transport.departure.localTime" type="time" class="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" :disabled="editingLocked" />
                  <input v-model="transport.departure.timeZone" type="text" class="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" placeholder="IANA 時區" :disabled="editingLocked" />
                </div>
              </div>
              <div class="rounded-xl bg-slate-50 p-3">
                <p class="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">抵達</p>
                <div class="mt-2 grid grid-cols-2 gap-2">
                  <input v-model="transport.arrival.location" type="text" class="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" placeholder="地點" :disabled="editingLocked" />
                  <input v-model="transport.arrival.localDate" type="date" class="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" :disabled="editingLocked" />
                  <input v-model="transport.arrival.localTime" type="time" class="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" :disabled="editingLocked" />
                  <input v-model="transport.arrival.timeZone" type="text" class="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" placeholder="IANA 時區" :disabled="editingLocked" />
                </div>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <label v-for="member in draft.members" :key="member.id" class="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" class="h-4 w-4 accent-amber-600" :checked="transport.participantIds.includes(member.id)" :disabled="editingLocked" @change="setParticipants(transport, member.id, ($event.target as HTMLInputElement).checked)" />
                {{ memberLabel(member) }}
              </label>
            </div>
            <select v-model="transport.status" class="mt-3 min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600" :disabled="editingLocked">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </article>

          <article class="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-4">
            <div class="grid gap-3 sm:grid-cols-[120px_1fr_auto]">
              <select v-model="transportDraft.kind" class="min-h-11 rounded-xl border border-amber-200 bg-white px-3 text-sm font-semibold" :disabled="editingLocked">
                <option v-for="kind in ['flight', 'train', 'bus', 'car', 'ferry', 'transfer', 'other']" :key="kind" :value="kind">{{ kind }}</option>
              </select>
              <input v-model="transportDraft.name" type="text" class="min-h-11 rounded-xl border border-amber-200 bg-white px-3 text-sm" placeholder="新增交通名稱" :disabled="editingLocked" />
              <button type="button" class="min-h-11 rounded-xl bg-amber-500 px-4 text-xs font-bold text-amber-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50" :disabled="editingLocked" @click="addTransport">新增交通</button>
            </div>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div class="grid grid-cols-2 gap-2">
                <input v-model="transportDraft.departure.location" type="text" class="min-h-10 rounded-lg border border-amber-200 bg-white px-2 text-xs" placeholder="出發地" :disabled="editingLocked" />
                <input v-model="transportDraft.departure.localDate" type="date" class="min-h-10 rounded-lg border border-amber-200 bg-white px-2 text-xs" :disabled="editingLocked" />
                <input v-model="transportDraft.departure.localTime" type="time" class="min-h-10 rounded-lg border border-amber-200 bg-white px-2 text-xs" :disabled="editingLocked" />
                <input v-model="transportDraft.departure.timeZone" type="text" class="min-h-10 rounded-lg border border-amber-200 bg-white px-2 text-xs" placeholder="出發時區" :disabled="editingLocked" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <input v-model="transportDraft.arrival.location" type="text" class="min-h-10 rounded-lg border border-amber-200 bg-white px-2 text-xs" placeholder="抵達地" :disabled="editingLocked" />
                <input v-model="transportDraft.arrival.localDate" type="date" class="min-h-10 rounded-lg border border-amber-200 bg-white px-2 text-xs" :disabled="editingLocked" />
                <input v-model="transportDraft.arrival.localTime" type="time" class="min-h-10 rounded-lg border border-amber-200 bg-white px-2 text-xs" :disabled="editingLocked" />
                <input v-model="transportDraft.arrival.timeZone" type="text" class="min-h-10 rounded-lg border border-amber-200 bg-white px-2 text-xs" placeholder="抵達時區" :disabled="editingLocked" />
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <label v-for="member in draft.members" :key="member.id" class="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" class="h-4 w-4 accent-amber-600" :checked="transportDraft.participantIds.includes(member.id)" :disabled="editingLocked" @change="setParticipants(transportDraft, member.id, ($event.target as HTMLInputElement).checked)" />
                {{ memberLabel(member) }}
              </label>
            </div>
          </article>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(22,54,54,.06)] sm:p-6" aria-labelledby="stay-heading">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[.2em] text-indigo-700">Accommodation / rooms</p>
            <h2 id="stay-heading" class="mt-1 text-2xl font-black tracking-tight">住宿、房間與福利</h2>
          </div>
          <button type="button" class="min-h-10 rounded-xl border border-indigo-200 px-3 text-xs font-bold text-indigo-800 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50" :disabled="editingLocked" @click="addAccommodation">＋ 新增住宿</button>
        </div>
        <div class="mt-5 grid gap-4 lg:grid-cols-2">
          <article v-for="stay in draft.accommodations" :key="stay.id" class="rounded-2xl border border-slate-200 p-4">
            <div class="flex gap-2">
              <input v-model="stay.name" type="text" class="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold focus:border-indigo-400 focus:bg-white" aria-label="住宿名稱" :disabled="editingLocked" />
              <button type="button" class="rounded-xl px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50" :disabled="editingLocked" @click="removeAccommodation(stay.id)">刪除</button>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <label class="text-[11px] font-semibold text-slate-500">入住<input v-model="stay.checkIn" type="date" class="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" :disabled="editingLocked" /></label>
              <label class="text-[11px] font-semibold text-slate-500">退房<input v-model="stay.checkOut" type="date" class="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" :disabled="editingLocked" /></label>
            </div>
            <div class="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              <label v-for="member in draft.members" :key="member.id" class="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" class="h-4 w-4 accent-indigo-700" :checked="stay.participantIds.includes(member.id)" :disabled="editingLocked" @change="setParticipants(stay, member.id, ($event.target as HTMLInputElement).checked)" />
                {{ memberLabel(member) }}
              </label>
            </div>
            <label class="mt-4 block text-[11px] font-semibold text-slate-500">包含福利
              <input :value="benefitsText(stay)" type="text" class="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs" placeholder="早餐、接駁…" :disabled="editingLocked" @input="updateBenefits(stay, ($event.target as HTMLInputElement).value)" />
            </label>
            <div class="mt-4 rounded-xl bg-slate-50 p-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">房間</p>
                <button type="button" class="text-xs font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="editingLocked" @click="addRoom(stay)">＋ 新增房間</button>
              </div>
              <div v-if="stay.rooms.length === 0" class="mt-2 text-xs text-slate-400">尚未分配房間，避免預設任何配對。</div>
              <div v-for="room in stay.rooms" :key="room.id" class="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <div class="flex gap-2">
                  <input v-model="room.name" type="text" class="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-xs font-semibold" aria-label="房間名稱" :disabled="editingLocked" />
                  <button type="button" class="px-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="editingLocked" @click="removeRoom(stay, room.id)">刪除</button>
                </div>
                <div class="mt-2 flex flex-wrap gap-x-3 gap-y-2">
                  <label v-for="member in draft.members" :key="member.id" class="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <input type="checkbox" class="h-3.5 w-3.5 accent-indigo-700" :checked="room.participantIds.includes(member.id)" :disabled="editingLocked || !stay.participantIds.includes(member.id)" @change="setParticipants(room, member.id, ($event.target as HTMLInputElement).checked)" />
                    {{ memberLabel(member) }}
                  </label>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>
