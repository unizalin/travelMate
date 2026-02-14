import { tripService } from '@/services/tripService'
import type { Database } from '@/types/database'
import { defineStore } from 'pinia'
import { ref } from 'vue'

type Trip = Database['public']['Tables']['trips']['Row']

export const useTripStore = defineStore('trip', () => {
  const trips = ref<Trip[]>([])
  const currentTrip = ref<any>(null) // using any for now to include joined relations
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTrips() {
    try {
      loading.value = true
      trips.value = await tripService.getTrips()
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchTripById(id: string) {
    try {
      loading.value = true
      currentTrip.value = await tripService.getTripById(id)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function createTrip(trip: any) {
    try {
      loading.value = true
      const newTrip = await tripService.createTrip(trip)
      trips.value.push(newTrip)
      return newTrip
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function joinTrip(inviteCode: string, userId: string) {
    try {
      loading.value = true
      const tripId = await tripService.joinTrip(inviteCode, userId)
      await fetchTrips() // refresh list
      return tripId
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteTrip(id: string) {
    try {
      loading.value = true
      await tripService.deleteTrip(id)
      trips.value = trips.value.filter(t => t.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateTrip(id: string, updates: any) {
    try {
      loading.value = true
      const updated = await tripService.updateTrip(id, updates)
      if (currentTrip.value && currentTrip.value.id === id) {
        currentTrip.value = { ...currentTrip.value, ...(updated as any) }
      }
      const index = trips.value.findIndex(t => t.id === id)
      if (index !== -1) {
        trips.value[index] = { ...(trips.value[index] as any), ...(updated as any) }
      }
      return updated
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    trips,
    currentTrip,
    loading,
    error,
    fetchTrips,
    fetchTripById,
    createTrip,
    joinTrip,
    deleteTrip,
    updateTrip
  }
})
