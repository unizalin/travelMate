<template>
  <div ref="mapContainer" class="w-full h-full relative z-0"></div>
</template>

<script setup lang="ts">
import { geocodeAddress } from '@/services/geocodingService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { onMounted, ref, watch } from 'vue';

// Fix Leaflet default icon issue
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activities: any[]
  highlightedId?: string | null
}>();

const emit = defineEmits<{
  (e: 'marker-click', activityId: string): void;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
const markers: Record<string, L.Marker> = {};
const coordsCache = ref<Record<string, [number, number]>>({});

// Create custom numbered icon
const createNumberedIcon = (number: number, isActive: boolean) => {
  const bg = isActive ? '#1D4ED8' : '#3B82F6';
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${bg};
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transition: transform 0.2s;
        transform: ${isActive ? 'scale(1.1)' : 'scale(1)'};
      ">
        ${number}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16] // Center anchor
  });
};

// Initialize Map
const initMap = () => {
  if (!mapContainer.value) return;

  // Default: Taipei
  map = L.map(mapContainer.value).setView([25.033, 121.5654], 13);

  // Use OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  updateMarkers();
};

// Update Markers
const updateMarkers = async () => {
  if (!map) return;

  // Clear old markers
  Object.values(markers).forEach(marker => marker.remove());
  for (const key in markers) delete markers[key];

  if (props.activities.length === 0) return;

  const bounds = L.latLngBounds([]);
  let hasValidCoords = false;

  for (let index = 0; index < props.activities.length; index++) {
    const activity = props.activities[index];
    let lat = activity.start_location_lat || activity.latitude;
    let lng = activity.start_location_lng || activity.longitude;

    // Try cache if missing
    if ((!lat || !lng) && coordsCache.value[activity.id]) {
      [lat, lng] = coordsCache.value[activity.id];
    }

    // Geocode if still missing and has location
    if ((!lat || !lng) && activity.location) {
      // Small delay to respect rate limits if batching (though Promise.all or sequential is better)
      // For UX, better to show what we have first, but let's try to fetch.
      // We'll process sequentially to be nice to the free API.
      const result = await geocodeAddress(activity.location);
      if (result) {
        lat = result.latitude;
        lng = result.longitude;
        coordsCache.value[activity.id] = [lat, lng];
      }
    }

    // Skip if still no coords
    if (!lat || !lng) continue;

    const isActive = props.highlightedId === activity.id;
    const marker = L.marker(
      [lat, lng],
      { icon: createNumberedIcon(index + 1, isActive) }
    )
      .addTo(map!)
      .bindPopup(`
        <div style="padding: 4px;">
          <h3 style="font-weight: bold; margin-bottom: 2px;">${activity.name}</h3>
          <p style="font-size: 12px; color: #666; margin: 0;">${activity.location}</p>
        </div>
      `)
      .on('click', () => {
        emit('marker-click', activity.id);
      });

    markers[activity.id] = marker;
    bounds.extend([lat, lng]);
    hasValidCoords = true;
  }

  if (hasValidCoords) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
};

watch(() => props.activities, () => {
  // Re-run update when activities change
  updateMarkers();
}, { deep: true });

watch(() => props.highlightedId, (newId) => {
  if (newId && markers[newId] && map) {
    const marker = markers[newId];
    map.setView(marker.getLatLng(), 15);
    marker.openPopup();
    
    // Update icons to reflect active state
    updateActiveIcon(newId);
  }
});

function updateActiveIcon(activeId: string) {
  props.activities.forEach((activity, index) => {
    const marker = markers[activity.id];
    if (marker) {
      marker.setIcon(createNumberedIcon(index + 1, activity.id === activeId));
    }
  });
}

onMounted(() => {
  initMap();
});
</script>

<style scoped>
.custom-marker {
  background: transparent;
  border: none;
}
</style>
