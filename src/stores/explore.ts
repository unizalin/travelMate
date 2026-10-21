import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/services/supabase'

export interface Destination {
    id: string
    name: string
    lat: number
    lng: number
    description?: string
    image_url?: string
    popularity: number
}

export interface PublicTrip {
    id: string
    name: string
    start_date: string
    end_date: string
}

export const useExploreStore = defineStore('explore', () => {
    const destinations = ref<Destination[]>([])
    const publicTrips = ref<PublicTrip[]>([])
    const dartResult = ref<Destination | null>(null)
    const isThrowing = ref(false)

    // Filters
    const filterDays = ref<number | null>(null)
    const filterDistance = ref<number | null>(null) // in km
    const currentLocation = ref<{ lat: number; lng: number } | null>(null)

    const fetchDestinations = async () => {
        const { data, error } = await supabase
            .from('destinations')
            .select('*')
            .order('popularity', { ascending: false })

        if (error) {
            console.error('Error fetching destinations:', error)
            return
        }

        if (data) {
            destinations.value = data
        }
    }

    const fetchPublicTrips = async () => {
        const { data, error } = await supabase
            .from('trips')
            .select('id, name, start_date, end_date')
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            console.error('Error fetching public trips:', error)
            return
        }

        if (data) {
            publicTrips.value = data as PublicTrip[]
        }
    }

    // Haversine formula to calculate distance
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371 // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1)
        const dLng = deg2rad(lng2 - lng1)
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const d = R * c // Distance in km
        return d
    }

    const deg2rad = (deg: number) => {
        return deg * (Math.PI / 180)
    }

    const throwDart = async () => {
        if (destinations.value.length === 0) {
            await fetchDestinations()
        }

        isThrowing.value = true
        dartResult.value = null

        // Filter logic
        let candidates = destinations.value

        if (filterDistance.value && currentLocation.value) {
            candidates = candidates.filter(dest => {
                const dist = calculateDistance(
                    currentLocation.value!.lat,
                    currentLocation.value!.lng,
                    dest.lat,
                    dest.lng
                )
                return dist <= filterDistance.value!
            })
        }

        // Simulate "thinking" or animation time
        await new Promise(resolve => setTimeout(resolve, 800))

        if (candidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * candidates.length)
            dartResult.value = candidates[randomIndex]
        } else if (destinations.value.length > 0) {
            const randomIndex = Math.floor(Math.random() * destinations.value.length)
            dartResult.value = destinations.value[randomIndex]
        }

        isThrowing.value = false
        return dartResult.value
    }

    return {
        destinations,
        publicTrips,
        dartResult,
        isThrowing,
        filterDays,
        filterDistance,
        currentLocation,
        fetchDestinations,
        fetchPublicTrips,
        throwDart
    }
})
