import { useAuthStore } from '@/stores/auth'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { title: '首頁' }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { title: '登入' }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/Register.vue'),
      meta: { title: '註冊' }
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../views/AuthCallback.vue'),
      meta: { title: '驗證中' }
    },
    {
      path: '/shared-trip/:tripId',
      name: 'shared-trip',
      component: () => import('../views/SharedTripView.vue'),
      meta: { title: '共享旅程' }
    },
    {
      path: '/trips',
      name: 'trips',
      component: () => import('../views/Trips.vue'),
      meta: { requiresAuth: true, title: '我的旅程' }
    },
    {
      path: '/trips/:tripId/map',
      name: 'trip-map-overview',
      component: () => import('../views/TripMapOverview.vue'),
      meta: { requiresAuth: true, title: '地圖總覽' }
    },
    {
      path: '/trips/:tripId/day/:dayNumber',
      redirect: to => {
        return `/trips/${to.params.tripId}/itinerary/${to.params.dayNumber}`
      }
    },
    {
      path: '/trips/:id',
      name: 'trip-detail',
      component: () => import('../views/TripDetail.vue'),
      meta: { requiresAuth: true, title: '旅程詳情' }
    },
    {
      path: '/trips/:tripId/itinerary/:dayNumber',
      name: 'day-detail',
      component: () => import('../views/DayDetail.vue'),
      meta: { requiresAuth: true, title: '單日行程' }
    },
    {
      path: '/trips/:tripId/overview',
      name: 'trip-overview',
      component: () => import('../views/TripOverview.vue'),
      meta: { requiresAuth: true, title: '旅程概覽' }
    },
    {
      path: '/join',
      name: 'join-trip',
      component: () => import('../views/JoinTrip.vue'),
      meta: { requiresAuth: true, title: '加入旅程' }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true, title: '個人設定' }
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Ensure session is loaded
  if (!authStore.session && !authStore.user) {
    await authStore.initializeAuth()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isAuthenticated = !!authStore.user

  if (requiresAuth && !isAuthenticated) {
    authStore.openAuthModal('login', to.fullPath)
    next('/')
  } else if (to.path === '/login' || to.path === '/register') {
    if (isAuthenticated) {
      next('/trips')
    } else {
      authStore.openAuthModal(to.path === '/login' ? 'login' : 'register')
      next('/')
    }
  } else if (to.path === '/' && isAuthenticated) {
    next('/trips')
  } else {
    next()
  }
})

router.afterEach((to) => {
  const baseTitle = 'TravelMate - 您的專屬旅遊夥伴'
  const pageTitle = to.meta.title as string
  if (pageTitle) {
    document.title = `${pageTitle} | ${baseTitle}`
  } else {
    document.title = baseTitle
  }
})

export default router
