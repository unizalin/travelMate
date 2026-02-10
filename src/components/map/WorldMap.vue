<template>
  <div class="relative w-full h-full">
    <div id="map" class="w-full h-full z-0"></div>
    <!-- Overlay for Loading/Effects could go here -->
    <div v-if="loading" class="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, shallowRef } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useExploreStore } from '@/stores/explore'
import { storeToRefs } from 'pinia'

// Fix Leaflet icon issue
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

const updateIcon = () => {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
        iconRetinaUrl,
        iconUrl,
        shadowUrl,
    })
}
updateIcon()

const props = defineProps<{
    // Optional events or props
}>()

const store = useExploreStore()
const { dartResult, publicTrips } = storeToRefs(store)

// Use shallowRef for Leaflet instances to avoid Deep Proxy performance/type issues
const map = shallowRef<L.Map | null>(null)
const markers = shallowRef<L.Marker[]>([])
const loading = ref(false)

// Custom Icons
const dartIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px #ef4444; border: 2px solid white;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
})

const tripIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #3b82f6; width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 5px #3b82f6;"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4]
})

onMounted(async () => {
  loading.value = true
  // Init Map
  // Default centered on "world"ish
  map.value = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([20, 0], 2)

  // Dark Mode Tiles (CartoDB Dark Matter)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
  }).addTo(map.value as L.Map)

  // Get User Location if possible
  if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
          store.currentLocation = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
          }
          // Optionally center on user or show user dot
          if (map.value) {
              L.marker([pos.coords.latitude, pos.coords.longitude], {
                  icon: L.divIcon({
                      html: `<div class="bg-primary-500 w-4 h-4 rounded-full border-2 border-white animate-pulse"></div>`,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8]
                  })
              }).addTo(map.value as L.Map)
          }
      })
  }

  // Fetch Tripss
  await store.fetchPublicTrips()
  renderPublicTrips()

  loading.value = false
})

const renderPublicTrips = () => {
    if (!map.value) return
    publicTrips.value.forEach(trip => {
        if (trip.location_lat && trip.location_lng) {
            const m = L.marker([trip.location_lat, trip.location_lng], { icon: tripIcon })
                .bindPopup(`<b>${trip.name}</b><br>Likes: ${trip.likes_count}`)
                .addTo(map.value as L.Map)
            markers.value.push(m)
        }
    })
}

// Watch for Dart Result
watch(dartResult, (newVal) => {
    if (newVal && map.value) {
        // Fly to animation
        map.value.flyTo([newVal.lat, newVal.lng], 6, {
            duration: 2.5, // 2.5 seconds flight
            easeLinearity: 0.25
        })

        // Add specific marker for dart result after delay?
        setTimeout(() => {
             if (!map.value || !newVal) return
             L.marker([newVal.lat, newVal.lng], { icon: dartIcon })
                .bindPopup(`<b>🎯 ${newVal.name}</b><br>${newVal.description || ''}`)
                .addTo(map.value as L.Map)
                .openPopup()
        }, 2500)
    }
})

</script>

<style>
/* Leaflet overrides if needed */
.leaflet-popup-content-wrapper {
    background: rgba(30, 30, 30, 0.9);
    backdrop-filter: blur(10px);
    color: white;
    border-radius: 12px;
}
.leaflet-popup-tip {
    background: rgba(30, 30, 30, 0.9);
}
</style>
