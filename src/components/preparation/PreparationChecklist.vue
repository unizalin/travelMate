<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { PACKING_TEMPLATE, type PackingCategory, type PackingItem } from '@/domain/packingChecklist'
import { preparationService } from '@/services/preparationService'

const props = withDefaults(defineProps<{ tripId: string; ownerId?: string | null; canEditShared?: boolean; embedded?: boolean }>(), { ownerId: null, canEditShared: false, embedded: false })
const items = ref<PackingItem[]>([])
const loading = ref(true)
const error = ref('')
const activeCategory = ref<PackingCategory>('必帶')
const newTitle = ref('')
const addingShared = ref(false)
const editingId = ref<string | null>(null)
const editingTitle = ref('')
const localKey = computed(() => `travelmate:packing:${props.tripId}:${props.ownerId ?? 'unclaimed'}`)
const isRemote = computed(() => Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY && /^[0-9a-f-]{36}$/i.test(props.tripId)))
const categories = computed(() => PACKING_TEMPLATE.map(category => category.category))
const visibleItems = computed(() => items.value.filter(item => item.category === activeCategory.value))
const completedCount = computed(() => items.value.filter(item => item.completed).length)
const progress = computed(() => items.value.length ? Math.round((completedCount.value / items.value.length) * 100) : 0)
const pendingKey = computed(() => `${localKey.value}:pending`)
const offline = ref(false)
type PendingOperation =
  | { kind: 'toggle'; category: PackingCategory; title: string; completed: boolean }
  | { kind: 'add'; category: PackingCategory; title: string; isShared: boolean }
const loadEpoch = ref(0)

function saveLocal(): void {
  try { localStorage.setItem(localKey.value, JSON.stringify(items.value)) } catch { /* cache is optional; remote state remains authoritative */ }
}

function loadLocal(): PackingItem[] {
  try { return JSON.parse(localStorage.getItem(localKey.value) ?? '[]') as PackingItem[] } catch { return [] }
}

function loadPending(): PendingOperation[] {
  try { return JSON.parse(localStorage.getItem(pendingKey.value) ?? '[]') as PendingOperation[] } catch { return [] }
}

function savePending(operations: PendingOperation[]): void {
  try {
    if (operations.length) localStorage.setItem(pendingKey.value, JSON.stringify(operations))
    else localStorage.removeItem(pendingKey.value)
  } catch { /* quota or private-mode storage must not break checklist actions */ }
}

function itemKey(item: Pick<PackingItem, 'category' | 'title'>): string {
  return `${item.category}:${item.title.trim().toLocaleLowerCase('zh-TW')}`
}

function queue(operation: PendingOperation): void {
  const operations = loadPending()
  const index = operations.findIndex(candidate => candidate.kind === operation.kind && candidate.category === operation.category && candidate.title === operation.title)
  if (index >= 0) operations[index] = operation
  else operations.push(operation)
  savePending(operations)
}

async function flushPending(epoch: number): Promise<void> {
  const pending = loadPending()
  if (!pending.length) { offline.value = false; return }
  const remaining: PendingOperation[] = []
  for (const operation of pending) {
    if (epoch !== loadEpoch.value) return
    try {
      if (operation.kind === 'add') {
        const exists = items.value.some(item => itemKey(item) === itemKey(operation))
        const local = items.value.find(item => itemKey(item) === itemKey(operation) && item.id.startsWith('local-'))
        if (!exists || local) {
          const created = await preparationService.addItem(props.tripId, operation.category, operation.title, operation.isShared, items.value.length + 1)
          if (local) items.value = items.value.map(item => item.id === local.id ? created : item)
          else items.value.push(created)
        }
      } else {
        const item = items.value.find(candidate => itemKey(candidate) === itemKey(operation))
        if (item) {
          await preparationService.toggleItem(item, operation.completed)
          item.completed = operation.completed
        }
        else remaining.push(operation)
      }
    } catch { remaining.push(operation) }
  }
  if (epoch === loadEpoch.value) { savePending(remaining); offline.value = remaining.length > 0; saveLocal() }
}

async function load(): Promise<void> {
  const epoch = ++loadEpoch.value
  loading.value = true
  error.value = ''
  try {
    if (!isRemote.value) {
      items.value = withMissingTemplateItems(loadLocal())
      saveLocal()
      return
    }
    let templateUnavailable = false
    try { await preparationService.ensureDefaults(props.tripId) } catch { templateUnavailable = true }
    const loaded = await preparationService.getItems(props.tripId, props.ownerId)
    if (epoch !== loadEpoch.value) return
    items.value = loaded
    offline.value = false
    if (templateUnavailable) error.value = '行前清單範本暫時無法更新；既有項目仍可使用。'
    saveLocal()
    await flushPending(epoch)
  } catch (reason) {
    if (epoch !== loadEpoch.value) return
    items.value = withMissingTemplateItems(loadLocal())
    saveLocal()
    offline.value = true
    error.value = `目前離線，顯示這個帳號的本機副本；${loadPending().length} 項變更待恢復連線後同步。`
  } finally { if (epoch === loadEpoch.value) loading.value = false }
}

function buildLocalTemplate(): PackingItem[] {
  return PACKING_TEMPLATE.flatMap((category, categoryIndex) => category.items.map((title, itemIndex) => ({ id: `local-template-${categoryIndex}-${itemIndex}`, tripId: props.tripId, category: category.category, title, isShared: true, ownerId: null, orderIndex: categoryIndex * 100 + itemIndex, completed: false })))
}

function withMissingTemplateItems(existing: PackingItem[]): PackingItem[] {
  const existingKeys = new Set(existing.map(itemKey))
  return [...existing, ...buildLocalTemplate().filter(item => !existingKeys.has(itemKey(item)))]
}

async function toggle(item: PackingItem): Promise<void> {
  const epoch = loadEpoch.value
  item.completed = !item.completed
  try {
    if (isRemote.value && !offline.value) await preparationService.toggleItem(item, item.completed)
    else { queue({ kind: 'toggle', category: item.category, title: item.title, completed: item.completed }); offline.value = true; saveLocal() }
  } catch { if (epoch === loadEpoch.value) { queue({ kind: 'toggle', category: item.category, title: item.title, completed: item.completed }); offline.value = true; saveLocal(); error.value = '目前離線，勾選已保留，恢復連線後同步。' } }
}

async function addItem(): Promise<void> {
  const epoch = loadEpoch.value
  const title = newTitle.value.trim()
  if (!title || (!addingShared.value && !props.ownerId)) { error.value = '請先到「我的航班」選擇自己，再新增個人項目。'; return }
  try {
    const item = isRemote.value && !offline.value
      ? await preparationService.addItem(props.tripId, activeCategory.value, title, addingShared.value, items.value.length + 1)
      : { id: `local-${Date.now()}`, tripId: props.tripId, category: activeCategory.value, title, isShared: addingShared.value, ownerId: addingShared.value ? null : props.ownerId, orderIndex: items.value.length + 1, completed: false }
    if (epoch !== loadEpoch.value) return
    items.value.push(item)
    newTitle.value = ''
    if (!isRemote.value || offline.value) { queue({ kind: 'add', category: activeCategory.value, title, isShared: addingShared.value }); offline.value = true; saveLocal(); error.value = '目前離線，新增項目已保留，恢復連線後同步。' }
  } catch {
    if (epoch !== loadEpoch.value) return
    items.value.push({ id: `local-${Date.now()}`, tripId: props.tripId, category: activeCategory.value, title, isShared: addingShared.value, ownerId: addingShared.value ? null : props.ownerId, orderIndex: items.value.length + 1, completed: false }); queue({ kind: 'add', category: activeCategory.value, title, isShared: addingShared.value }); offline.value = true; saveLocal(); error.value = '目前離線，新增項目已保留，恢復連線後同步。'
  }
}

function startEdit(item: PackingItem): void { editingId.value = item.id; editingTitle.value = item.title }
async function saveEdit(item: PackingItem): Promise<void> {
  const epoch = loadEpoch.value
  const title = editingTitle.value.trim()
  if (!title) return
  try { if (isRemote.value) await preparationService.updateItem(item.id, title); if (epoch !== loadEpoch.value) return; item.title = title; if (!isRemote.value) saveLocal(); editingId.value = null } catch { error.value = '旅伴項目只有 Owner／Editor 可以修改。' }
}
async function remove(item: PackingItem): Promise<void> {
  const epoch = loadEpoch.value
  try { if (isRemote.value) await preparationService.deleteItem(item.id); if (epoch !== loadEpoch.value) return; items.value = items.value.filter(candidate => candidate.id !== item.id); if (!isRemote.value) saveLocal() } catch { error.value = '這個項目目前無法刪除。' }
}

onMounted(load)
watch(() => [props.ownerId, props.canEditShared, props.tripId], () => { void load() })
</script>

<template>
  <section class="preparation-checklist rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(22,54,54,.06)] sm:p-6" :class="{ 'packing-embedded': embedded }" aria-labelledby="packing-heading">
    <template v-if="embedded">
      <div class="embedded-heading">
        <h2 id="packing-heading">行前清單 <small>{{ completedCount }}/{{ items.length }}</small></h2>
        <p>五類項目分開勾選；個人新增項目只會在自己的帳號出現。</p>
      </div>
      <p v-if="error" class="embedded-error" role="status">{{ error }}</p>
      <p v-if="loading" class="embedded-empty">載入行李清單…</p>
      <template v-else>
        <details v-for="(category, index) in categories" :key="category" class="embedded-category" :open="index === 0">
          <summary>{{ category }}</summary>
          <div v-for="item in items.filter(item => item.category === category)" :key="item.id" class="embedded-item">
            <label class="embedded-check">
              <input type="checkbox" :checked="item.completed" :aria-label="item.title" @change="toggle(item)" />
              <span v-if="editingId !== item.id" :class="{ completed: item.completed }">{{ item.title }}</span>
            </label>
            <template v-if="editingId === item.id">
              <input v-model="editingTitle" class="embedded-edit" :aria-label="`編輯${item.title}`" @keyup.enter="saveEdit(item)" />
              <button type="button" class="embedded-action" @click="saveEdit(item)">儲存</button>
            </template>
            <template v-else>
              <small v-if="!item.isShared" class="embedded-kind">我的</small>
              <button v-if="item.isShared ? canEditShared : item.ownerId === ownerId" type="button" class="embedded-icon" :aria-label="`編輯${item.title}`" @click="startEdit(item)"><PencilSquareIcon class="h-4 w-4" /></button>
              <button v-if="!item.isShared && item.ownerId === ownerId" type="button" class="embedded-icon" :aria-label="`刪除${item.title}`" @click="remove(item)"><TrashIcon class="h-4 w-4" /></button>
            </template>
          </div>
          <p v-if="!items.some(item => item.category === category)" class="embedded-empty">這個分類還沒有項目。</p>
        </details>
      </template>
      <div class="embedded-add">
        <div class="embedded-selects">
          <select v-model="activeCategory" aria-label="新增項目分類"><option v-for="category in categories" :key="category" :value="category">{{ category }}</option></select>
          <select v-model="addingShared" aria-label="新增項目範圍" :disabled="!canEditShared"><option :value="false">我的項目</option><option :value="true">旅伴項目</option></select>
        </div>
        <div class="embedded-add-row"><input v-model="newTitle" aria-label="新增行李項目" placeholder="新增行李項目" @keyup.enter="addItem" /><button type="button" :disabled="!newTitle.trim() || (addingShared && !canEditShared)" @click="addItem"><PlusIcon class="h-4 w-4" />新增</button></div>
        <p>旅伴項目由 Owner／Editor 管理；未認領前不能建立個人項目。</p>
      </div>
    </template>
    <template v-else>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="packing-heading" class="text-sm font-semibold text-[#263331]">行前清單</h2><p class="mt-1 text-xs leading-5 text-[#7A8783]">五類項目分開勾選；個人新增項目只會在自己的帳號出現。</p></div>
      <div class="packing-progress rounded-2xl bg-teal-50 px-4 py-3 text-right"><span class="block text-2xl font-black text-teal-800">{{ progress }}%</span><span class="text-[10px] font-bold text-teal-700">{{ completedCount }}/{{ items.length }} 已完成</span></div>
    </div>
    <p v-if="error" class="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900" role="status">{{ error }}</p>
    <div class="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><button v-for="category in categories" :key="category" type="button" :aria-pressed="activeCategory === category" class="packing-category min-h-10 shrink-0 rounded-full border px-4 text-xs font-bold" :class="activeCategory === category ? 'border-teal-800 bg-teal-800 text-white' : 'border-slate-200 text-slate-600'" @click="activeCategory = category">{{ category }}</button></div>
    <div v-if="loading" class="py-10 text-center text-sm text-slate-400">載入行李清單…</div>
    <div v-else class="mt-4 space-y-2">
      <article v-for="item in visibleItems" :key="item.id" class="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-3" :class="item.completed ? 'bg-teal-50/70' : 'bg-white'">
        <button type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-black" :class="item.completed ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 text-transparent'" :aria-label="`${item.title}：${item.completed ? '已完成' : '未完成'}`" @click="toggle(item)">✓</button>
        <div v-if="editingId === item.id" class="flex min-w-0 flex-1 gap-2"><input v-model="editingTitle" class="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-sm" @keyup.enter="saveEdit(item)" /><button type="button" class="text-xs font-bold text-teal-700" @click="saveEdit(item)">儲存</button></div>
        <span v-else class="min-w-0 flex-1 text-sm font-semibold" :class="item.completed ? 'text-slate-400 line-through' : 'text-slate-700'">{{ item.title }}</span>
        <span v-if="!item.isShared" class="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">我的</span>
        <button v-if="item.isShared ? canEditShared : item.ownerId === ownerId" type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="編輯項目" @click="startEdit(item)"><PencilSquareIcon class="h-4 w-4" /></button>
        <button v-if="!item.isShared && item.ownerId === ownerId" type="button" class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label="刪除項目" @click="remove(item)"><TrashIcon class="h-4 w-4" /></button>
      </article>
      <p v-if="visibleItems.length === 0" class="py-6 text-center text-sm text-slate-400">這個分類還沒有你的項目。</p>
    </div>
    <div class="mt-5 rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 p-3"><div class="flex gap-2"><select v-model="addingShared" class="min-h-10 rounded-xl border border-teal-200 bg-white px-2 text-xs font-bold" :disabled="!canEditShared"><option :value="false">我的項目</option><option :value="true">旅伴項目</option></select><input v-model="newTitle" class="min-h-10 min-w-0 flex-1 rounded-xl border border-teal-200 bg-white px-3 text-sm" placeholder="新增準備項目" @keyup.enter="addItem" /><button type="button" class="packing-add flex min-h-10 items-center gap-1 rounded-xl bg-teal-800 px-3 text-xs font-bold text-white disabled:opacity-40" :disabled="!newTitle.trim() || (addingShared && !canEditShared)" @click="addItem"><PlusIcon class="h-4 w-4" />新增</button></div><p class="mt-2 text-[11px] text-slate-500">旅伴項目由 Owner／Editor 管理；未認領前不能建立個人項目。</p></div>
    </template>
  </section>
</template>

<style scoped>
.preparation-checklist{border-radius:14px;box-shadow:none}.packing-category[aria-pressed="true"],.packing-add{background:var(--iceland-action,#115e59);border-color:var(--iceland-action,#115e59);min-height:44px}.packing-progress{background:var(--iceland-mist,#f0fdfa)}.packing-progress span{color:var(--iceland-glacier,#115e59)}
.preparation-checklist.packing-embedded{border:0;border-radius:0;box-shadow:none;padding:0;background:transparent}
.embedded-heading h2{font-size:13px;font-weight:600;line-height:1.5;color:#263331;margin:0 0 6px}.embedded-heading h2 small{font-size:11.5px;font-weight:400;color:#7a8783;margin-left:5px}.embedded-heading p,.embedded-add p{font-size:11px;line-height:1.5;color:#7a8783;margin:0 0 7px}.embedded-category{border-top:1px solid #dde3de;padding:5px 0}.embedded-category summary{cursor:pointer;min-height:40px;display:flex;align-items:center;justify-content:space-between;color:#263331;font-size:13px;font-weight:600}.embedded-item{display:flex;align-items:center;gap:6px;min-width:0;border-top:1px dashed #dde3de;padding:6px 0 6px 10px}.embedded-check{display:flex;align-items:flex-start;gap:9px;min-width:0;flex:1;cursor:pointer;color:#263331;font-size:13px;line-height:1.5}.embedded-check input{width:17px;height:17px;flex:none;margin-top:1px;accent-color:#397d86}.embedded-check span{overflow-wrap:anywhere}.embedded-check .completed{color:#7a8783;text-decoration:line-through}.embedded-kind{font-size:10px;color:#7a8783;white-space:nowrap}.embedded-icon,.embedded-action{min-width:32px;min-height:32px;display:inline-flex;align-items:center;justify-content:center;color:#397d86}.embedded-edit{min-width:0;flex:1;min-height:38px;border:1px solid #dde3de;border-radius:8px;padding:7px;font-size:13px}.embedded-empty{font-size:12px;color:#7a8783;padding:8px 0}.embedded-error{font-size:12px;color:#8a4b28;background:#fdf3ec;border:1px solid #f0d9c8;border-radius:9px;padding:6px 9px}.embedded-add{border-top:1px solid #dde3de;padding-top:12px;margin-top:8px}.embedded-selects,.embedded-add-row{display:flex;gap:8px;margin-bottom:8px}.embedded-selects select,.embedded-add-row input{min-width:0;flex:1;min-height:40px;border:1px solid #dde3de;border-radius:9px;background:#fff;padding:7px 9px;color:#263331;font-size:12px}.embedded-add-row button{display:inline-flex;align-items:center;gap:3px;min-height:40px;border:1px solid #397d86;border-radius:9px;padding:7px 11px;color:#397d86;font-size:12px;font-weight:600}.embedded-add-row button:disabled{opacity:.5}.packing-embedded :is(button,input,select,summary):focus-visible{outline:3px solid #83b3b6;outline-offset:2px}
</style>
