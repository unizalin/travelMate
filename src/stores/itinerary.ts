import { activityService } from '@/services/activityService'
import { itineraryService } from '@/services/itineraryService'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useItineraryStore = defineStore('itinerary', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itineraries = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchItineraries(tripId: string, startDate?: string, endDate?: string) {
    try {
      loading.value = true

      // Auto-ensure days exist if dates provided
      if (startDate && endDate) {
        await itineraryService.ensureItineraries(tripId, startDate, endDate)
      }

      const data = await itineraryService.fetchItineraries(tripId)

      // Sort activities by order_index
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data?.forEach((itinerary: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        itinerary.activities?.sort((a: any, b: any) => a.order_index - b.order_index)
      })

      itineraries.value = data || []
    } catch (e: any) {
      console.error(e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function updateActivity(id: string, updates: any) {
    try {
      loading.value = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedActivity: any = await activityService.updateActivity(id, updates)

      if (!updatedActivity) throw new Error('Update returned no data')

      // Update local state
      // Find the itinerary containing this activity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itinerary = itineraries.value.find((i: any) => i.id === updatedActivity.itinerary_id)
      if (itinerary && itinerary.activities) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const index = itinerary.activities.findIndex((a: any) => a.id === id)
        if (index !== -1) {
          itinerary.activities[index] = updatedActivity
          // If order changed, re-sort
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          itinerary.activities.sort((a: any, b: any) => a.order_index - b.order_index)
        }
      }
      return updatedActivity
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function createActivity(activity: any) {
    try {
      loading.value = true

      // Auto-calculate order_index if missing
      if (activity.order_index === undefined) {
        const itinerary = itineraries.value.find((i: any) => i.id === activity.itinerary_id)
        activity.order_index = (itinerary?.activities?.length || 0) + 1
      }

      const newActivity = await activityService.createActivity(activity)
      // Refresh or push to local state
      const itinerary = itineraries.value.find((i: any) => i.id === activity.itinerary_id)
      if (itinerary) {
        if (!itinerary.activities) itinerary.activities = []
        itinerary.activities.push(newActivity)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        itinerary.activities.sort((a: any, b: any) => a.order_index - b.order_index)
      }
      return newActivity
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function deleteActivity(id: string, itineraryId: string) {
    try {
      loading.value = true
      await activityService.deleteActivity(id)
      // Remove from local state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itinerary = itineraries.value.find((i: any) => i.id === itineraryId)
      if (itinerary && itinerary.activities) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        itinerary.activities = itinerary.activities.filter((a: any) => a.id !== id)
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateActivitiesBatch(itineraryId: string, activities: any[]) {
    try {
      loading.value = true

      const updates = activities.map((activity, index) => ({
        ...activity,
        itinerary_id: itineraryId,
        order_index: index + 1
      }))

      await activityService.updateActivitiesBatch(updates)

      // Update local state for this itinerary
      const itinerary = itineraries.value.find((i: any) => i.id === itineraryId)
      if (itinerary) {
        itinerary.activities = activities.map((a, index) => ({
          ...a,
          itinerary_id: itineraryId,
          order_index: index + 1
        }))
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function reorderItineraries(tripId: string, newItineraries: any[], startDateStr: string) {
    try {
      loading.value = true
      const startDate = new Date(startDateStr)

      const updates = newItineraries.map((itinerary, index) => {
        const dayNumber = index + 1
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + index)

        return {
          id: itinerary.id,
          trip_id: tripId,
          day_number: dayNumber,
          date: date.toISOString().split('T')[0]
        }
      })

      await itineraryService.updateItinerariesBatch(updates)

      // Update local state and sort properly
      itineraries.value = newItineraries.map((itinerary, index) => ({
        ...itinerary,
        day_number: index + 1,
        date: updates[index].date
      }))

    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    itineraries,
    loading,
    error,
    fetchItineraries,
    createActivity,
    updateActivity,
    deleteActivity,
    reorderItineraries,
    updateActivitiesBatch
  }
})
