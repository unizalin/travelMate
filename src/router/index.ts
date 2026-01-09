import { useAuthStore } from '@/stores/auth'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      // Allow public access to home, but redirect to trips if logged in (in guard)
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/Register.vue')
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../views/AuthCallback.vue')
    },
    {
      path: '/shared-trip/:tripId',
      name: 'shared-trip',
      component: () => import('../views/SharedTripView.vue')
    },
    {
      path: '/trips',
      name: 'trips',
      component: () => import('../views/Trips.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/trips/:tripId/map',
      name: 'trip-map-overview',
      component: () => import('../views/TripMapOverview.vue'),
      meta: { requiresAuth: true }
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
      meta: { requiresAuth: true }
    },
    {
      path: '/trips/:tripId/itinerary/:dayNumber',
      name: 'day-detail',
      component: () => import('../views/DayDetail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/trips/:tripId/overview',
      name: 'trip-overview',
      component: () => import('../views/TripOverview.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/join',
      name: 'join-trip',
      component: () => import('../views/JoinTrip.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true }
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
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && isAuthenticated) {
    next('/trips')
  } else if (to.path === '/' && isAuthenticated) {
    next('/trips')
  } else {
    next()
  }
})

export default router
