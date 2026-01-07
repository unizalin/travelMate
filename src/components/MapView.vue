<script setup lang="ts">
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { onMounted, ref, watch } from 'vue';

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activities: any[]
}>()

const mapContainer = ref<HTMLElement | null>(null)
const map = ref<mapboxgl.Map | null>(null)
const markers = ref<mapboxgl.Marker[]>([])

// Default center (Taipei 101)
const DEFAULT_CENTER: [number, number] = [121.5645, 25.0339]

onMounted(() => {
  if (!mapContainer.value) return

  // Check if token is available
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) {
    console.warn('VITE_MAPBOX_ACCESS_TOKEN or VITE_MAPBOX_TOKEN is missing. Map may not load.');
  } else {
    mapboxgl.accessToken = token;
  }

  // If no token, maybe we can't initialize properly, but we'll try
  // Note: Without a valid token, Mapbox won't render tiles.

  try {
    map.value = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: 12
    });

    map.value.on('load', () => {
      updateMarkers()
    })
  } catch (error) {
    console.error("Failed to initialize map:", error)
  }
})

watch(() => props.activities, () => {
  updateMarkers()
}, { deep: true })

function updateMarkers() {
  if (!map.value) return

  // Clear existing markers
  markers.value.forEach(marker => marker.remove())
  markers.value = []

  if (props.activities.length === 0) return

  const bounds = new mapboxgl.LngLatBounds()
  let hasValidCoords = false

  props.activities.forEach(activity => {
    // In a real app, we need lat/lng stored in activity or geocoded.
    // Assuming for now activity has lat/lng or we can't map it without geocoding service.
    // For this prototype, I will assume we might need to mock or geocode. 
    // Since geocoding is async and costly, let's check if activity has 'coordinates' property 
    // or try to use a simple hash for demo if not provided (NOT RECOMMENDED for production but good for mockup if no geo data).

    // Better approach: User requirement didn't explicitly say geocode, 
    // but Mapbox needs [lng, lat]. 
    // Let's assume user inputs might not have coords yet.
    // If coords missing, we skip marker or simple fallback.

    // START UPDATE: To make this robust, we should create a helper or store coords.
    // For this MVP, let's use a placeholder approach if no coords, 
    // OR just handle props if they have it.

    if (activity.start_location_lat && activity.start_location_lng) {
      const coords: [number, number] = [activity.start_location_lng, activity.start_location_lat]

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<strong>${activity.name}</strong><br>${activity.location || ''}`);

      // @ts-ignore - Mapbox GL type compatibility issue
      const marker = new mapboxgl.Marker({ color: '#3B82F6' })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.value!)

      markers.value.push(marker)
      bounds.extend(coords)
      hasValidCoords = true
    }
  })

  // Since we don't have lat/lng in schema yet (schema only has 'location' text),
  // we technically can't show real markers without geocoding.
  // **CRITICAL DECISION**: I will add a comment that Geocoding is needed or schema update needed.
  // For now, I will simulate markers for demo if input text contains "Taipei" just to show it works, 
  // or just handle empty state if no coords. 

  if (hasValidCoords) {
    map.value.fitBounds(bounds, { padding: 50, maxZoom: 15 })
  }
}
</script>

<template>
  <div class="w-full h-full rounded-lg overflow-hidden border border-gray-200 bg-gray-100 relative">
    <div ref="mapContainer" class="w-full h-full" />
    <div v-if="!map" class="absolute inset-0 flex items-center justify-center text-gray-400">
      地圖載入中...
    </div>
  </div>
</template>

<style scoped>
/* Ensure container has height */
</style>
