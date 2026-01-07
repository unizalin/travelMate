<script setup lang="ts">
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { onMounted, ref, watch } from 'vue';
import { MapPinIcon } from '@heroicons/vue/24/outline'; // Assuming this icon is available

const props = defineProps<{
  activities: any[]
  highlightedId?: string | null
}>()

const emit = defineEmits<{
  (e: 'marker-click', activityId: string): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
const map = ref<mapboxgl.Map | null>(null)
const markers = ref<Record<string, mapboxgl.Marker>>({})

// Default center (Taipei 101)
const DEFAULT_CENTER: [number, number] = [121.5645, 25.0339]

onMounted(() => {
  if (!mapContainer.value) return

  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) {
    console.error('Mapbox access token is missing! Please set VITE_MAPBOX_TOKEN in .env');
    return;
  }
  mapboxgl.accessToken = token;

  try {
    map.value = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: 12,
      attributionControl: false
    });

    // @ts-ignore - Mapbox deep type issue
    map.value.addControl(new mapboxgl.NavigationControl(), 'top-right');

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

watch(() => props.highlightedId, (newId) => {
  if (newId && markers.value[newId]) {
    const marker = markers.value[newId];
    // Zoom to marker
    map.value?.easeTo({
      center: marker.getLngLat(),
      zoom: 15,
      duration: 1000
    });
    // Open popup
    marker.togglePopup();
  }
})

// Mock coordinates for demo if missing
function getMockCoords(activity: any, index: number): [number, number] {
  if (activity.start_location_lng && activity.start_location_lat) {
    return [activity.start_location_lng, activity.start_location_lat];
  }
  
  // Deterministic mock around Taipei based on index to spread them out
  const offset = 0.01;
  return [
    DEFAULT_CENTER[0] + (Math.cos(index) * offset),
    DEFAULT_CENTER[1] + (Math.sin(index) * offset)
  ];
}

function createNumberMarker(number: number, isActive: boolean) {
  const el = document.createElement('div');
  el.className = `w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-sm font-bold transition-all duration-300 cursor-pointer hover:scale-110`;
  el.style.backgroundColor = isActive ? '#1D4ED8' : '#3B82F6';
  el.style.color = 'white';
  el.innerText = number.toString();
  return el;
}

function updateMarkers() {
  if (!map.value || !map.value.loaded()) return

  // Clear existing markers
  Object.values(markers.value).forEach(marker => marker.remove())
  markers.value = {}

  if (props.activities.length === 0) return

  const bounds = new mapboxgl.LngLatBounds()

  props.activities.forEach((activity, index) => {
    const coords = getMockCoords(activity, index);
    const isActive = props.highlightedId === activity.id;
    
    const el = createNumberMarker(index + 1, isActive);
    
    const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
      .setHTML(`
        <div class="p-2 font-sans">
          <div class="font-bold text-gray-900">${activity.name}</div>
          <div class="text-xs text-gray-500 mt-0.5">${activity.location || ''}</div>
        </div>
      `);

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(coords)
      .setPopup(popup)
      // @ts-ignore
      .addTo(map.value!)

    // Handle marker click to emit event
    el.addEventListener('click', () => {
      emit('marker-click', activity.id);
    });

    markers.value[activity.id] = marker;
    bounds.extend(coords);
  })

  map.value.fitBounds(bounds, { 
    padding: { top: 50, bottom: 50, left: 50, right: 50 },
    maxZoom: 15,
    linear: false
  });
}
</script>

<template>
  <div class="w-full h-full bg-gray-50 relative">
    <div ref="mapContainer" class="w-full h-full" />
    
    <!-- Empty/Loading State Overlay -->
    <div v-if="!mapboxgl.accessToken" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-8 text-center">
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 max-w-sm">
        <MapPinIcon class="w-12 h-12 text-orange-400 mx-auto mb-4" />
        <h3 class="text-gray-900 font-bold">地圖未載入</h3>
        <p class="text-gray-500 text-sm mt-2">
          請在 <code>.env</code> 檔案中設置有效的 <code>VITE_MAPBOX_TOKEN</code>。
        </p>
      </div>
    </div>
  </div>
</template>

<style>
/* Global Mapbox Popup Styles */
.mapboxgl-popup-content {
  border-radius: 12px !important;
  padding: 0 !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
  overflow: hidden;
}
.mapboxgl-popup-tip {
  border-top-color: white !important;
}
</style>
