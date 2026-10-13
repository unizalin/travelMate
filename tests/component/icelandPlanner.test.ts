import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IcelandPlanner from '@/views/IcelandPlanner.vue'
import { icelandJourney } from '@/data/icelandJourney'
import { loadLocalJourney, withTripId } from '@/domain/tripJourney'

const loadJourney = vi.fn()
const createJourney = vi.fn()
const saveJourney = vi.fn()
const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  session: null,
  initializeAuth: vi.fn(),
  store: null as { user: { id: string } | null; session: unknown; initializeAuth: ReturnType<typeof vi.fn> } | null,
}))

vi.mock('@/services/journeyService', () => ({
  loadJourney,
  createJourney,
  saveJourney,
}))

vi.mock('@/stores/auth', async () => {
  const { reactive } = await import('vue')
  authState.store ??= reactive({
    user: authState.user,
    session: authState.session,
    initializeAuth: authState.initializeAuth,
  })
  return { useAuthStore: () => authState.store }
})

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ name: 'iceland-planner', path: '/trips/:tripId/journey', component: IcelandPlanner }],
  })
}

function setAuthUser(id: string | null): void {
  authState.user = id ? { id } : null
  if (authState.store) authState.store.user = authState.user
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('IcelandPlanner cloud controls', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    process.env.VITE_SUPABASE_URL = ''
    process.env.VITE_SUPABASE_ANON_KEY = ''
    const values = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    })
    loadJourney.mockReset()
    createJourney.mockReset()
    saveJourney.mockReset()
    authState.user = null
    authState.session = null
    if (authState.store) {
      authState.store.user = null
      authState.store.session = null
    }
    authState.initializeAuth.mockReset()
  })

  it('keeps a dirty local draft when cloud loading fails', async () => {
    loadJourney.mockRejectedValue(new Error('network unavailable'))
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await flushPromises()

    const nameInput = wrapper.find('input[aria-label="成員 1 名稱"]')
    await nameInput.setValue('暫存名稱')
    const loadButton = wrapper.findAll('button').find(button => button.text() === '載入雲端')
    expect(loadButton).toBeDefined()
    await loadButton!.trigger('click')
    await flushPromises()

    expect((nameInput.element as HTMLInputElement).value).toBe('暫存名稱')
    expect(wrapper.text()).toContain('network unavailable')
    wrapper.unmount()
  })

  it('disables cloud updates when the returned envelope is read-only', async () => {
    loadJourney.mockResolvedValue({
      tripId: icelandJourney.tripId,
      revision: 4,
      journey: icelandJourney,
      canEdit: false,
      updatedAt: '2026-10-13T00:00:00Z',
    })
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await wrapper.findAll('button').find(button => button.text() === '載入雲端')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('雲端：僅可讀')
    const updateButton = wrapper.findAll('button').find(button => button.text() === '更新雲端')
    expect(updateButton?.attributes('disabled')).toBeDefined()
    expect(wrapper.find('input[aria-label="成員 1 名稱"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('keeps a dirty draft pending without advancing the cloud CAS revision', async () => {
    loadJourney.mockResolvedValue({
      tripId: 'tripbook-iceland-2026',
      revision: 9,
      journey: icelandJourney,
      canEdit: false,
      updatedAt: '2026-10-13T00:00:00Z',
    })
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })

    const nameInput = wrapper.find('input[aria-label="成員 1 名稱"]')
    await nameInput.setValue('本機未合併名稱')
    await wrapper.findAll('button').find(button => button.text() === '載入雲端')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('本機與雲端都有變更')
    await wrapper.findAll('button').find(button => button.text() === '保留本機版本')!.trigger('click')
    expect((nameInput.element as HTMLInputElement).value).toBe('本機未合併名稱')
    expect(wrapper.text()).toContain('更新功能暫停')
    expect(nameInput.attributes('disabled')).toBeDefined()

    const updateButton = wrapper.findAll('button').find(button => button.text() === '更新雲端')
    expect(updateButton?.attributes('disabled')).toBeDefined()
    await updateButton!.trigger('click')
    expect(saveJourney).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('keeps a local-saved draft pending when cloud loading returns later', async () => {
    loadJourney.mockResolvedValue({
      tripId: 'tripbook-iceland-2026',
      revision: 10,
      journey: icelandJourney,
      canEdit: true,
      updatedAt: '2026-10-13T00:00:00Z',
    })
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })

    const nameInput = wrapper.find('input[aria-label="成員 1 名稱"]')
    await nameInput.setValue('本機已保存名稱')
    await wrapper.findAll('button').find(button => button.text() === '儲存本機')!.trigger('click')
    expect(wrapper.text()).toContain('本機草稿待同步')

    await wrapper.findAll('button').find(button => button.text() === '載入雲端')!.trigger('click')
    await flushPromises()

    expect((nameInput.element as HTMLInputElement).value).toBe('本機已保存名稱')
    expect(wrapper.text()).toContain('本機與雲端都有變更')
    expect(wrapper.text()).not.toContain('本機：已同步')
    wrapper.unmount()
  })

  it('locks editing while saving and sends the captured request snapshot', async () => {
    loadJourney.mockResolvedValue({
      tripId: icelandJourney.tripId,
      revision: 7,
      journey: icelandJourney,
      canEdit: true,
      updatedAt: '2026-10-13T00:00:00Z',
    })
    const savedResponse = deferred<{ tripId: string; revision: number; journey: typeof icelandJourney; canEdit: boolean; updatedAt: string }>()
    saveJourney.mockReturnValue(savedResponse.promise)
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })

    await wrapper.findAll('button').find(button => button.text() === '載入雲端')!.trigger('click')
    await flushPromises()
    const nameInput = wrapper.find('input[aria-label="成員 1 名稱"]')
    await nameInput.setValue('送出快照名稱')
    await wrapper.findAll('button').find(button => button.text() === '更新雲端')!.trigger('click')
    await flushPromises()

    expect(saveJourney).toHaveBeenCalledTimes(1)
    const [tripId, expectedRevision, payload] = saveJourney.mock.calls[0] as [string, number, typeof icelandJourney]
    expect(tripId).toBe(icelandJourney.tripId)
    expect(expectedRevision).toBe(7)
    expect(payload.members[0].displayName).toBe('送出快照名稱')
    expect(nameInput.attributes('disabled')).toBeDefined()

    savedResponse.resolve({
      tripId: icelandJourney.tripId,
      revision: 8,
      journey: { ...icelandJourney, members: [{ ...icelandJourney.members[0], displayName: '雲端回應名稱' }, ...icelandJourney.members.slice(1)] },
      canEdit: true,
      updatedAt: '2026-10-13T00:00:01Z',
    })
    await flushPromises()
    expect((nameInput.element as HTMLInputElement).value).toBe('雲端回應名稱')
    wrapper.unmount()
  })

  it('discards a stale cloud response after changing the route journey', async () => {
    const oldResponse = deferred<{ tripId: string; revision: number; journey: typeof icelandJourney; canEdit: boolean; updatedAt: string }>()
    const nextResponse = deferred<{ tripId: string; revision: number; journey: typeof icelandJourney; canEdit: boolean; updatedAt: string }>()
    const oldJourney = {
      ...icelandJourney,
      members: [{ ...icelandJourney.members[0], displayName: '舊旅程名稱' }, ...icelandJourney.members.slice(1)],
    }
    const nextJourney = {
      ...icelandJourney,
      tripId: 'next-trip',
      members: [{ ...icelandJourney.members[0], displayName: '新旅程名稱' }, ...icelandJourney.members.slice(1)],
    }
    loadJourney.mockImplementation((tripId: string) => tripId === icelandJourney.tripId ? oldResponse.promise : nextResponse.promise)
    const router = makeRouter()
    await router.push(`/trips/${icelandJourney.tripId}/journey`)
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await wrapper.findAll('button').find(button => button.text() === '載入雲端')!.trigger('click')
    await flushPromises()

    await router.push('/trips/next-trip/journey')
    await router.isReady()
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text() === '載入雲端')!.trigger('click')
    await flushPromises()

    oldResponse.resolve({ tripId: icelandJourney.tripId, revision: 1, journey: oldJourney, canEdit: true, updatedAt: '2026-10-13T00:00:00Z' })
    await flushPromises()
    expect((wrapper.find('input[aria-label="成員 1 名稱"]').element as HTMLInputElement).value).not.toBe('舊旅程名稱')

    nextResponse.resolve({ tripId: 'next-trip', revision: 2, journey: nextJourney, canEdit: true, updatedAt: '2026-10-13T00:00:01Z' })
    await flushPromises()
    expect((wrapper.find('input[aria-label="成員 1 名稱"]').element as HTMLInputElement).value).toBe('新旅程名稱')
    wrapper.unmount()
  })

  it('discards a stale cloud response after changing accounts', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    setAuthUser('account-a')
    const oldResponse = deferred<{ tripId: string; revision: number; journey: typeof icelandJourney; canEdit: boolean; updatedAt: string }>()
    const nextResponse = deferred<{ tripId: string; revision: number; journey: typeof icelandJourney; canEdit: boolean; updatedAt: string }>()
    const oldJourney = {
      ...icelandJourney,
      members: [{ ...icelandJourney.members[0], displayName: '舊帳號名稱' }, ...icelandJourney.members.slice(1)],
    }
    const nextJourney = {
      ...icelandJourney,
      members: [{ ...icelandJourney.members[0], displayName: '新帳號名稱' }, ...icelandJourney.members.slice(1)],
    }
    loadJourney.mockImplementationOnce(() => oldResponse.promise).mockImplementationOnce(() => nextResponse.promise)
    const router = makeRouter()
    await router.push(`/trips/${icelandJourney.tripId}/journey`)
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await flushPromises()

    setAuthUser('account-b')
    await flushPromises()
    oldResponse.resolve({ tripId: icelandJourney.tripId, revision: 3, journey: oldJourney, canEdit: true, updatedAt: '2026-10-13T00:00:00Z' })
    await flushPromises()
    expect((wrapper.find('input[aria-label="成員 1 名稱"]').element as HTMLInputElement).value).not.toBe('舊帳號名稱')

    nextResponse.resolve({ tripId: icelandJourney.tripId, revision: 4, journey: nextJourney, canEdit: true, updatedAt: '2026-10-13T00:00:01Z' })
    await flushPromises()
    expect((wrapper.find('input[aria-label="成員 1 名稱"]').element as HTMLInputElement).value).toBe('新帳號名稱')
    wrapper.unmount()
  })

  it('uses the server journey id after creation and reloads that id on a fresh mount', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    setAuthUser('qa-owner')

    const serverJourney = withTripId(icelandJourney, 'server-real-uuid')
    const serverEnvelope = {
      tripId: 'server-real-uuid',
      revision: 1,
      journey: serverJourney,
      canEdit: true,
      updatedAt: '2026-10-13T00:00:00Z',
    }
    loadJourney.mockRejectedValue(new Error('not created yet'))
    createJourney.mockResolvedValue(serverEnvelope)

    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await flushPromises()

    const createButton = wrapper.findAll('button').find(button => button.text() === '建立雲端')
    expect(createButton?.attributes('disabled')).toBeUndefined()
    await createButton!.trigger('click')
    await flushPromises()

    expect(createJourney).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.params.tripId).toBe('server-real-uuid')
    expect(createButton?.attributes('disabled')).toBeDefined()

    wrapper.unmount()
    loadJourney.mockResolvedValue(serverEnvelope)
    const freshRouter = makeRouter()
    await freshRouter.push('/trips/server-real-uuid/journey')
    await freshRouter.isReady()
    const freshWrapper = mount(IcelandPlanner, { global: { plugins: [freshRouter] } })
    await flushPromises()

    expect(loadJourney).toHaveBeenLastCalledWith('server-real-uuid')
    expect(freshWrapper.text()).toContain('雲端：可編輯')
    freshWrapper.unmount()
  })

  it.each(['apply', 'save'] as const)('persists adopted cloud content across a fresh mount after %s', async action => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    setAuthUser('qa-owner')
    const envelope = { tripId: icelandJourney.tripId, revision: 1, journey: icelandJourney, canEdit: true }
    loadJourney.mockResolvedValue(envelope)
    const router = makeRouter()
    await router.push(`/trips/${icelandJourney.tripId}/journey`)
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await flushPromises()
    await wrapper.find('input[aria-label="成員 1 名稱"]').setValue('舊本機草稿')
    await wrapper.findAll('button').find(button => button.text() === '儲存本機')!.trigger('click')

    if (action === 'apply') {
      await wrapper.findAll('button').find(button => button.text() === '載入雲端')!.trigger('click')
      await flushPromises()
      await wrapper.findAll('button').find(button => button.text() === '套用雲端版本')!.trigger('click')
    } else {
      await wrapper.find('input[aria-label="成員 1 名稱"]').setValue('已同步名稱')
      const journey = { ...icelandJourney, members: [{ ...icelandJourney.members[0], displayName: '已同步名稱' }, ...icelandJourney.members.slice(1)] }
      const saved = { ...envelope, revision: 2, journey }
      saveJourney.mockResolvedValue(saved)
      await wrapper.findAll('button').find(button => button.text() === '更新雲端')!.trigger('click')
      await flushPromises()
      loadJourney.mockResolvedValue(saved)
    }
    const expectedName = action === 'apply' ? null : '已同步名稱'
    expect(loadLocalJourney('qa-owner', icelandJourney.tripId)?.members[0].displayName).toBe(expectedName)
    wrapper.unmount()

    const freshRouter = makeRouter()
    await freshRouter.push(`/trips/${icelandJourney.tripId}/journey`)
    await freshRouter.isReady()
    const freshWrapper = mount(IcelandPlanner, { global: { plugins: [freshRouter] } })
    await flushPromises()
    expect((freshWrapper.find('input[aria-label="成員 1 名稱"]').element as HTMLInputElement).value).toBe(expectedName ?? '')
    expect(freshWrapper.text()).not.toContain('本機與雲端都有變更')
    expect(freshWrapper.text()).toContain('本機：已同步')
    freshWrapper.unmount()
  })

  it('keeps cloud success distinct from a failed local cache write', async () => {
    loadJourney.mockResolvedValue({ tripId: icelandJourney.tripId, revision: 1, journey: icelandJourney, canEdit: true })
    const router = makeRouter()
    await router.push(`/trips/${icelandJourney.tripId}/journey`)
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
    await wrapper.findAll('button').find(button => button.text() === '載入雲端')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('已載入可編輯的雲端草稿')
    expect(wrapper.text()).toContain('本機副本儲存失敗')
    expect(wrapper.text()).not.toContain('本機：已同步')
    write.mockRestore()
    await wrapper.findAll('button').find(button => button.text() === '儲存本機')!.trigger('click')
    expect(wrapper.text()).not.toContain('本機副本儲存失敗')
    wrapper.unmount()
  })
})
