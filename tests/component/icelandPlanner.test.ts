vi.mock('@/services/tripWeatherService', () => ({ loadDayForecast: async () => ({ kind: 'unavailable', fetchedAt: new Date().toISOString() }) }))
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import IcelandPlanner from '@/views/IcelandPlanner.vue'
import { icelandJourney } from '@/data/icelandJourney'
import { ICELAND_TRIP_ID } from '@/router/iceland'
import { londonSeedItems } from '@/domain/londonJourney'
import { loadLocalJourney, withTripId } from '@/domain/tripJourney'

const loadJourney = vi.fn()
const createJourney = vi.fn()
const saveJourney = vi.fn()
const saveJourneyMemo = vi.fn()
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
  saveJourneyMemo,
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

async function expectIdentityStatus(wrapper: VueWrapper, router: ReturnType<typeof makeRouter>, status: string) {
  const query = { ...router.currentRoute.value.query }
  await router.replace({ query: { ...query, section: 'me' } })
  await flushPromises()
  expect(wrapper.get('.identity-card').text()).toContain(status)
  await router.replace({ query })
  await flushPromises()
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
  afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers()})
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
    saveJourneyMemo.mockReset()
    authState.user = null
    authState.session = null
    if (authState.store) {
      authState.store.user = null
      authState.store.session = null
    }
    authState.initializeAuth.mockReset()
  })

  it('renders an account-scoped downloaded journey read-only when offline', async () => {
    vi.stubEnv('VITE_SUPABASE_URL','http://supabase.test')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY','anon-key')
    const connection=vi.spyOn(navigator,'onLine','get').mockReturnValue(false)
    setAuthUser('offline-account')
    const {saveLocalJourney}=await import('@/domain/tripJourney')
    saveLocalJourney('offline-account',icelandJourney)
    loadJourney.mockRejectedValue(new Error('offline'))
    const router=makeRouter(); await router.push(`/trips/${icelandJourney.tripId}/journey`)
    const wrapper=mount(IcelandPlanner,{global:{plugins:[router]}}); await flushPromises()
    expect(wrapper.text()).toContain('Costco Wholesale Iceland')
    expect(wrapper.find('.activity-editor,.drag-handle,.edit-footer').exists()).toBe(false)
    await router.replace({query:{section:'me'}});await flushPromises()
    expect(wrapper.get('.identity-card').text()).toContain('離線副本 · 僅供閱讀')
    wrapper.unmount(); connection.mockRestore()
  })

  it('uses the same itinerary reader for companions without a second reading destination', async () => {
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    expect(wrapper.find('.trip-reader').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('← 閱讀行程')
    expect(wrapper.findAll('button').some(button => button.text() === '行前準備')).toBe(true)
    expect(wrapper.find('[aria-label="行程日期"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="活動留言"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps the canceled accommodation card hidden even for members', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    setAuthUser('qa-owner')
    loadJourney.mockResolvedValue({ tripId: icelandJourney.tripId, revision: 1, journey: icelandJourney, canEdit: true, updatedAt: '2026-10-22T00:00:00Z' })
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await flushPromises()
    await wrapper.get('#day-tab-2026-11-02').trigger('click')
    expect(wrapper.find('.compact-stay').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows only the loaded document stay for each night and excludes checkout', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    setAuthUser('qa-owner')
    const journey = structuredClone(icelandJourney)
    const nights = [
      ['2026-10-30', '2026-11-01', 'U16 by Stay in Iceland'],
      ['2026-11-01', '2026-11-02', 'Aurora Igloo South'],
      ['2026-11-02', '2026-11-03', 'The Barn'],
      ['2026-11-03', '2026-11-04', 'Lækjarhus Farm Holidays'],
      ['2026-11-04', '2026-11-05', 'Hotel Jökulsárlón - Glacier Lagoon Hotel'],
      ['2026-11-05', '2026-11-06', 'Apartments Reykjavík'],
      ['2026-11-06', '2026-11-07', 'Silica Hotel'],
    ]
    journey.accommodations = nights.map(([checkIn, checkOut, name], index) => ({
      id: `fixture-stay-${index}`, tripId: journey.tripId, name, checkIn, checkOut,
      participantIds: [], rooms: [], benefits: [],
    }))
    const response = deferred<{ tripId: string; revision: number; journey: typeof journey; canEdit: boolean }>()
    loadJourney.mockReturnValue(response.promise)
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.find('.tonight-stay').exists()).toBe(false)
    response.resolve({ tripId: journey.tripId, revision: 1, journey, canEdit: true })
    await flushPromises()
    for (const [date, name] of [
      ['2026-10-30', nights[0][2]], ['2026-10-31', nights[0][2]],
      ...nights.slice(1).map(([date, , name]) => [date, name]),
    ]) {
      await wrapper.get(`#day-tab-${date}`).trigger('click')
      expect(wrapper.get('.tonight-stay').text()).toBe(`今晚住宿：${name} ↗`)
      const navigation=wrapper.get('.tonight-stay a')
      expect(navigation.attributes('href')).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`)
      expect(navigation.attributes('target')).toBe('_blank')
      expect(navigation.attributes('rel')).toContain('noreferrer')
      expect(wrapper.find('.compact-stay').exists()).toBe(false)
    }
    await wrapper.get('#day-tab-2026-11-07').trigger('click')
    expect(wrapper.find('.tonight-stay').exists()).toBe(false)
    wrapper.unmount()
  })

  it.each([false,true])('renders document photography guidance even when card projection=%s omits photo fields', async projected => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    setAuthUser('qa-owner')
    const journey = structuredClone(icelandJourney)
    journey.items = [{
      ...journey.items[0], id:'document-photo', date:'2026-11-02', name:'Document photo stop',
      photoTip:'Document shooting tip', photoSpots:[
        {id:'document-phone',title:'Phone',device:'phone',composition:'Document phone composition',sourceLabel:'Fixture'},
        {id:'document-camera',title:'Camera',device:'camera',composition:'Document camera composition',sourceLabel:'Fixture'},
      ],
    }, { ...journey.items[0], id:'document-no-photo', date:'2026-11-02', name:'No photo stop', photoTip:null, photoSpots:[] }]
    loadJourney.mockResolvedValue({tripId:journey.tripId,revision:1,journey,canEdit:true})
    const router=makeRouter(); await router.push('/trips/tripbook-iceland-2026/journey')
    const wrapper=mount(IcelandPlanner,{global:{plugins:[router],stubs:projected ? {ItineraryActivities:{props:['items'],template:'<div><div v-for="item in items" :key="item.id" :id="`activity-${item.id}`"><slot name="photography" :item="{...item, photoTip:undefined, photoSpots:undefined}" /></div></div>'}} : {}}}); await flushPromises()
    await wrapper.get('#day-tab-2026-11-02').trigger('click'); await flushPromises()
    const photo=wrapper.get('#activity-document-photo [data-testid="photography-spots"]')
    expect(photo.element.tagName).toBe('DETAILS')
    expect(photo.attributes('open')).toBeUndefined()
    expect(photo.get('summary').text()).toBe('拍攝建議')
    expect(photo.text()).toContain('iPhone')
    expect(photo.text()).toContain('相機')
    expect(photo.text()).toContain('Document phone composition')
    expect(photo.text()).toContain('Document camera composition')
    expect(wrapper.find('#activity-document-no-photo [data-testid="photography-spots"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('攝影偏好與收藏')
    wrapper.unmount()
  })

  it('shows the active Iceland aurora card in the global area before the tabs and keeps the daily summary compact', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T12:00:00Z'))
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await flushPromises()

    const global = wrapper.find('.global-information')
    expect(global.find('[aria-labelledby="aurora-heading"]').exists()).toBe(true)
    expect(global.element.compareDocumentPosition(wrapper.get('.journey-dates').element) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    const morningCheck = wrapper.find('.morning')
    expect(morningCheck.find('.checks').exists()).toBe(false)
    expect(wrapper.get('.weather-details').find('.morning').exists()).toBe(true)
    expect(wrapper.get('.weather-details').attributes('open')).toBeUndefined()
    expect(wrapper.find('.route-line').exists()).toBe(true)
    expect(wrapper.find('[aria-label="建議行程節奏"]').exists()).toBe(false)
    expect(wrapper.find('.journey-notices').exists()).toBe(false)
    const ordered = ['.route-line', '.weather-line', '.practical', '.outfit', '.plan-b']
      .map(selector => wrapper.find(selector))
    ordered.push(wrapper.findAll('.activities .activity').at(-1)!)
    expect(ordered.every(element => element.exists())).toBe(true)
    for (let index = 0; index < ordered.length - 1; index += 1) {
      expect(ordered[index].element.compareDocumentPosition(ordered[index + 1].element) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    }
    expect(wrapper.find('.edit-footer').findAll('button')).toHaveLength(1)
    wrapper.unmount()
    vi.useRealTimers()
  })

  it('opens flight selection from the login destination and follows tab navigation', async () => {
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey?section=flights')
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    const flightsTab = () => wrapper.findAll('[aria-label="旅程檢視"] button').find(button => button.text() === '我的航班')
    expect(flightsTab()?.attributes('aria-current')).toBe('page')
    expect(wrapper.find('[aria-label="身分與航班"]').isVisible()).toBe(true)
    await router.push('/trips/tripbook-iceland-2026/journey')
    await flushPromises()
    expect(wrapper.find('#view-flights').exists()).toBe(false)
    expect(wrapper.find('#view-preparation').exists()).toBe(false)
    expect(wrapper.findAll('[aria-label="旅程檢視"] button').find(button => button.text() === '行程')?.attributes('aria-current')).toBe('page')
    await router.push('/trips/tripbook-iceland-2026/journey?section=flights')
    await flushPromises()
    expect(flightsTab()?.attributes('aria-current')).toBe('page')
    wrapper.unmount()
  })

  it('shows activity threads without a shared memo editor', async () => {
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    expect(wrapper.find('[aria-label="活動留言"]').exists()).toBe(true)
    expect(wrapper.find('textarea[aria-label="共用 Memo"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('共用筆記')
    expect(wrapper.text()).not.toContain('旅伴')
    wrapper.unmount()
  })

  it('saves London edits through the same journey CAS without altering Iceland activities', async () => {
    const journey = structuredClone({ ...icelandJourney,items:[...icelandJourney.items,...londonSeedItems(icelandJourney.tripId)],dayPlans:{'2026-10-24':{keep:'Hammersmith 入住',skip:'夜間散步'}} })
    loadJourney.mockResolvedValue({tripId:journey.tripId,revision:7,journey,canEdit:true,updatedAt:'2026-10-20T00:00:00Z'})
    saveJourney.mockImplementation(async (tripId,revision,snapshot) => ({tripId,revision:revision+1,journey:snapshot,canEdit:true,updatedAt:'2026-10-20T00:01:00Z'}))
    const router=makeRouter(); await router.push(`/trips/${journey.tripId}/journey`); await router.isReady()
    const wrapper=mount(IcelandPlanner,{global:{plugins:[router]}})
    await wrapper.findAll('button').find(button => button.text()==='重新載入 Supabase')!.trigger('click'); await flushPromises()
    await wrapper.get('#leg-tab-london').trigger('click')
    await wrapper.get('#day-tab-2026-10-24').trigger('click')
    expect(wrapper.find('[aria-label="倫敦前段行程"]').isVisible()).toBe(true)
    expect(wrapper.findAll('[aria-label="行程日期"]')).toHaveLength(1)
    expect(wrapper.findAll('[aria-label="行程日期"] [role="tab"]')).toHaveLength(6)
    expect(wrapper.find('[aria-label="行程日期"] [role="tab"]').attributes('aria-label')).toContain('10月24日')
    const london=wrapper.get('[aria-label="倫敦前段行程"]')
    expect(wrapper.findAll('.edit-footer')).toHaveLength(1)
    expect(london.find('footer').exists()).toBe(false)
    expect(wrapper.findAll('[aria-label="行程段落"]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('加入共同行程')
    expect(wrapper.text()).not.toContain('行程預覽')
    expect(saveJourney).not.toHaveBeenCalled()
    await wrapper.get('.edit-footer button').trigger('click')
    await london.findAll('.plan-b input')[0].setValue('保住 Hammersmith 入住')
    await london.findAll('.plan-b input')[1].setValue('刪除夜間散步')
    await london.get('.activity-editor input').setValue('修改後的 Hammersmith 交通')
    await wrapper.findAll('button').find(button => button.text()==='儲存變更')!.trigger('click'); await flushPromises()
    expect(saveJourney).toHaveBeenCalledTimes(1)
    const snapshot=saveJourney.mock.calls[0][2]
    expect(snapshot.items.find((item:{id:string}) => item.id==='london-2026-10-24-1').name).toBe('修改後的 Hammersmith 交通')
    expect(snapshot.items.filter((item:{id:string}) => !item.id.startsWith('london-'))).toEqual(icelandJourney.items)
    expect(snapshot.dayPlans['2026-10-24']).toEqual({keep:'保住 Hammersmith 入住',skip:'刪除夜間散步'})
    await expectIdentityStatus(wrapper, router, '已同步')
    await wrapper.get('#leg-tab-iceland').trigger('click')
    await wrapper.get('#day-tab-2026-10-30').trigger('click')
    expect(wrapper.find('[aria-label="倫敦前段行程"]').exists()).toBe(false)
    expect(wrapper.find('.prelude-people').exists()).toBe(false)
    expect(wrapper.find('.activities').text()).toContain('Costco')
    expect(wrapper.get('.daily-heading').text()).toContain('Day 01')
    wrapper.unmount()
  })

  it('keeps a dirty local draft when cloud loading fails', async () => {
    loadJourney.mockRejectedValue(new Error('network unavailable'))
    const router = makeRouter()
    await router.push('/trips/tripbook-iceland-2026/journey')
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text() === '編輯行程')!.trigger('click')
    const nameInput = wrapper.find('.activity-editor input')
    await nameInput.setValue('暫存名稱')
    const loadButton = wrapper.findAll('button').find(button => button.text() === '重新載入 Supabase')
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
    await wrapper.findAll('button').find(button => button.text() === '重新載入 Supabase')!.trigger('click')
    await flushPromises()

    await expectIdentityStatus(wrapper, router, '目前僅可閱讀')
    const updateButton = wrapper.findAll('button').find(button => button.text() === '儲存變更')
    expect(updateButton).toBeUndefined()
    expect(wrapper.findAll('button').some(button => button.text() === '編輯行程')).toBe(false)
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

    await wrapper.findAll('button').find(button => button.text() === '編輯行程')!.trigger('click')
    const nameInput = wrapper.find('.activity-editor input')
    await nameInput.setValue('本機未合併名稱')
    await wrapper.findAll('button').find(button => button.text() === '重新載入 Supabase')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('本機與雲端都有變更')
    await wrapper.findAll('button').find(button => button.text() === '保留本機版本')!.trigger('click')
    expect((nameInput.element as HTMLInputElement).value).toBe('本機未合併名稱')
    expect(wrapper.text()).toContain('更新功能暫停')
    expect(nameInput.attributes('disabled')).toBeDefined()

    const updateButton = wrapper.findAll('button').find(button => button.text() === '儲存變更')
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

    await wrapper.findAll('button').find(button => button.text() === '編輯行程')!.trigger('click')
    const nameInput = wrapper.find('.activity-editor input')
    await nameInput.setValue('本機已保存名稱')
    await wrapper.findAll('button').find(button => button.text() === '儲存裝置備份')!.trigger('click')
    await expectIdentityStatus(wrapper, router, '有尚未儲存的變更')

    await wrapper.findAll('button').find(button => button.text() === '重新載入 Supabase')!.trigger('click')
    await flushPromises()

    expect((nameInput.element as HTMLInputElement).value).toBe('本機已保存名稱')
    expect(wrapper.text()).toContain('本機與雲端都有變更')
    expect(wrapper.find('.journey-header').text()).not.toContain('已同步')
    wrapper.unmount()
  })

  it.each(['flights', 'more', 'itinerary'])('shows only public content in %s without journey access', async section => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    setAuthUser('qa-owner')
    loadJourney.mockRejectedValue(Object.assign(new Error('此帳號尚無可存取的冰島雲端旅程。'), { code: 'JOURNEY_NOT_FOUND' }))
    const router = makeRouter()
    await router.push(`/trips/tripbook-iceland-2026/journey?section=${section}`)
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('一起去倫敦・冰島')
    expect(wrapper.text()).not.toContain('建立新旅程')
    expect(wrapper.text()).not.toContain('先建立或加入旅程')
    expect(wrapper.find('[aria-label="身分與航班"]').exists()).toBe(false)
    expect(wrapper.find('.compact-stay').exists()).toBe(false)
    expect(wrapper.find('textarea[aria-label="共用 Memo"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('儲存與同步設定')
    for (const stay of icelandJourney.accommodations) expect(wrapper.text()).not.toContain(stay.name)
    expect(createJourney).not.toHaveBeenCalled()
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

    await wrapper.findAll('button').find(button => button.text() === '重新載入 Supabase')!.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text() === '編輯行程')!.trigger('click')
    const nameInput = wrapper.find('.activity-editor input')
    await nameInput.setValue('送出快照名稱')
    await wrapper.findAll('button').find(button => button.text() === '儲存變更')!.trigger('click')
    await flushPromises()

    expect(saveJourney).toHaveBeenCalledTimes(1)
    const [tripId, expectedRevision, payload] = saveJourney.mock.calls[0] as [string, number, typeof icelandJourney]
    expect(tripId).toBe(icelandJourney.tripId)
    expect(expectedRevision).toBe(7)
    expect(payload.items[0].name).toBe('送出快照名稱')
    expect(nameInput.attributes('disabled')).toBeDefined()

    savedResponse.resolve({
      tripId: icelandJourney.tripId,
      revision: 8,
      journey: { ...icelandJourney, items: [{ ...icelandJourney.items[0], name: '雲端回應名稱' }, ...icelandJourney.items.slice(1)] },
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
      items: [{ ...icelandJourney.items[0], name: '舊旅程名稱' }, ...icelandJourney.items.slice(1)],
    }
    const nextJourney = {
      ...icelandJourney,
      tripId: 'next-trip',
      items: [{ ...icelandJourney.items[0], tripId: 'next-trip', name: '新旅程名稱' }, ...icelandJourney.items.slice(1).map(item => ({ ...item, tripId: 'next-trip' }))],
    }
    loadJourney.mockImplementation((tripId: string) => tripId === icelandJourney.tripId ? oldResponse.promise : nextResponse.promise)
    const router = makeRouter()
    await router.push(`/trips/${icelandJourney.tripId}/journey`)
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    await wrapper.findAll('button').find(button => button.text() === '編輯行程')!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === '重新載入 Supabase')!.trigger('click')
    await flushPromises()

    await router.push('/trips/next-trip/journey')
    await router.isReady()
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text() === '重新載入 Supabase')!.trigger('click')
    await flushPromises()

    oldResponse.resolve({ tripId: icelandJourney.tripId, revision: 1, journey: oldJourney, canEdit: true, updatedAt: '2026-10-13T00:00:00Z' })
    await flushPromises()
    expect((wrapper.find('.activity-editor input').element as HTMLInputElement).value).not.toBe('舊旅程名稱')

    nextResponse.resolve({ tripId: 'next-trip', revision: 2, journey: nextJourney, canEdit: true, updatedAt: '2026-10-13T00:00:01Z' })
    await flushPromises()
    expect((wrapper.find('.activity-editor input').element as HTMLInputElement).value).toBe('新旅程名稱')
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
      items: [{ ...icelandJourney.items[0], name: '舊帳號名稱' }, ...icelandJourney.items.slice(1)],
    }
    const nextJourney = {
      ...icelandJourney,
      items: [{ ...icelandJourney.items[0], name: '新帳號名稱' }, ...icelandJourney.items.slice(1)],
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
    expect(wrapper.text()).not.toContain('舊帳號名稱')

    nextResponse.resolve({ tripId: icelandJourney.tripId, revision: 4, journey: nextJourney, canEdit: true, updatedAt: '2026-10-13T00:00:01Z' })
    await flushPromises()
    expect({ buttons: wrapper.findAll('button').map(button => button.text()) }).toEqual(expect.objectContaining({ buttons: expect.arrayContaining(['編輯行程']) }))
    await wrapper.findAll('button').find(button => button.text() === '編輯行程')!.trigger('click')
    expect((wrapper.find('.activity-editor input').element as HTMLInputElement).value).toBe('新帳號名稱')
    wrapper.unmount()
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
    await wrapper.findAll('button').find(button => button.text() === '編輯行程')!.trigger('click')
    await wrapper.find('.activity-editor input').setValue('舊本機草稿')
    await wrapper.findAll('button').find(button => button.text() === '儲存裝置備份')!.trigger('click')

    if (action === 'apply') {
      await wrapper.findAll('button').find(button => button.text() === '重新載入 Supabase')!.trigger('click')
      await flushPromises()
      await wrapper.findAll('button').find(button => button.text() === '套用雲端版本')!.trigger('click')
    } else {
      await wrapper.find('.activity-editor input').setValue('已同步名稱')
      const journey = { ...icelandJourney, items: [{ ...icelandJourney.items[0], name: '已同步名稱' }, ...icelandJourney.items.slice(1)] }
      const saved = { ...envelope, revision: 2, journey }
      saveJourney.mockResolvedValue(saved)
      await wrapper.findAll('button').find(button => button.text() === '儲存變更')!.trigger('click')
      await flushPromises()
      loadJourney.mockResolvedValue(saved)
    }
    const expectedName = action === 'apply' ? null : '已同步名稱'
    expect(loadLocalJourney('qa-owner', icelandJourney.tripId)?.items[0].name).toBe(expectedName ?? icelandJourney.items[0].name)
    wrapper.unmount()

    const freshRouter = makeRouter()
    await freshRouter.push(`/trips/${icelandJourney.tripId}/journey`)
    await freshRouter.isReady()
    const freshWrapper = mount(IcelandPlanner, { global: { plugins: [freshRouter] } })
    await flushPromises()
    await freshWrapper.findAll('button').find(button => button.text() === '編輯行程')!.trigger('click')
    expect((freshWrapper.find('.activity-editor input').element as HTMLInputElement).value).toBe(expectedName ?? icelandJourney.items[0].name)
    expect(freshWrapper.text()).not.toContain('本機與雲端都有變更')
    await expectIdentityStatus(freshWrapper, freshRouter, '已同步')
    freshWrapper.unmount()
  })

  it('keeps cloud success distinct from a failed local cache write', async () => {
    loadJourney.mockResolvedValue({ tripId: icelandJourney.tripId, revision: 1, journey: icelandJourney, canEdit: true })
    const router = makeRouter()
    await router.push(`/trips/${icelandJourney.tripId}/journey`)
    await router.isReady()
    const wrapper = mount(IcelandPlanner, { global: { plugins: [router] } })
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
    await wrapper.findAll('button').find(button => button.text() === '重新載入 Supabase')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('已載入可編輯的雲端草稿')
    expect(wrapper.text()).toContain('本機副本儲存失敗')
    await expectIdentityStatus(wrapper, router, '已同步')
    write.mockRestore()
    await wrapper.findAll('button').find(button => button.text() === '儲存裝置備份')!.trigger('click')
    expect(wrapper.text()).not.toContain('本機副本儲存失敗')
    wrapper.unmount()
  })
})
