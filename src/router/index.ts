import { createRouter, createWebHistory } from 'vue-router'

import { ICELAND_READER_PATH, ICELAND_TRIP_ID, ICELAND_FLIGHTS_PATH } from './iceland'
export { ICELAND_READER_PATH, ICELAND_TRIP_ID } from './iceland'
const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: ICELAND_FLIGHTS_PATH,
    },
    {
      path: '/iceland',
      name: 'iceland-planner',
      component: () => import('../views/IcelandJourney.vue'),
      meta: { hideMobileTab: true, title: '冰島行程' },
    },
    {
      path: '/share/iceland',
      name: 'share-iceland',
      redirect: '/iceland',
    },
    {
      path: '/share/:tripId',
      name: 'share-trip-reader',
      component: () => import('../views/IcelandReader.vue'),
      meta: { publicReader: true, title: '共享旅程' },
    },
    {
      path: '/iceland/plan',
      redirect: `/trips/${ICELAND_TRIP_ID}/journey`,
    },
    {
      path: '/iceland/planning',
      redirect: `/trips/${ICELAND_TRIP_ID}/journey`,
    },
    {
      path: '/explore',
      redirect: ICELAND_READER_PATH,
    },
    {
      path: '/trips',
      redirect: ICELAND_FLIGHTS_PATH,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { title: '登入' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/Register.vue'),
      meta: { title: '註冊' },
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../views/AuthCallback.vue'),
      meta: { title: '驗證中' },
    },
    {
      path: '/trips/:tripId/journey',
      name: 'iceland-legacy-planner',
      redirect: to => ({ path: '/iceland', query: to.query }),
    },
    {
      path: '/trips/:tripId/map',
      name: 'trip-map-overview',
      component: () => import('../views/TripMapOverview.vue'),
      meta: { requiresAuth: true, title: '地圖總覽' },
    },
    {
      path: '/trips/:tripId/day/:dayNumber',
      redirect: to => `/trips/${to.params.tripId}/itinerary/${to.params.dayNumber}`,
    },
    {
      path: '/trips/:id',
      name: 'trip-detail',
      component: () => import('../views/TripDetail.vue'),
      meta: { requiresAuth: true, title: '旅程詳情' },
    },
    {
      path: '/trips/:tripId/itinerary/:dayNumber',
      name: 'day-detail',
      component: () => import('../views/DayDetail.vue'),
      meta: { requiresAuth: true, title: '單日行程' },
    },
    {
      path: '/trips/:tripId/overview',
      name: 'trip-overview',
      component: () => import('../views/TripOverview.vue'),
      meta: { requiresAuth: true, title: '旅程概覽' },
    },
    {
      path: '/join',
      name: 'join-trip',
      component: () => import('../views/JoinTrip.vue'),
      meta: { requiresAuth: true, title: '加入旅程' },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true, title: '個人設定' },
    },
  ],
})

router.beforeEach(async to => {
  if (to.matched.some(record => record.meta.publicReader)) return true

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  if (!supabaseConfigured && (requiresAuth || to.path === '/login' || to.path === '/register' || to.path === '/auth/callback')) return ICELAND_READER_PATH

  if (!requiresAuth && to.path !== '/login' && to.path !== '/register') return true

  const { useAuthStore } = await import('@/stores/auth')
  const authStore = useAuthStore()
  if (!authStore.session && !authStore.user) await authStore.initializeAuth()
  const isAuthenticated = !!authStore.user

  if (requiresAuth && !isAuthenticated) {
    authStore.openAuthModal('login', to.fullPath)
    return ICELAND_READER_PATH
  }
  if ((to.path === '/login' || to.path === '/register') && isAuthenticated) return ICELAND_FLIGHTS_PATH
  if (to.path === '/login' || to.path === '/register') {
    authStore.openAuthModal(to.path === '/login' ? 'login' : 'register', ICELAND_FLIGHTS_PATH)
    return ICELAND_READER_PATH
  }
  return true
})

router.afterEach(to => {
  const baseTitle = 'TripBook · 旅程規劃'
  const pageTitle = to.meta.title as string | undefined
  document.title = pageTitle ? `${pageTitle} | ${baseTitle}` : baseTitle
})

export default router
