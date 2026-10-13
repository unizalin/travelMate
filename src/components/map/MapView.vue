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
  showRoute?: boolean
}>();

const emit = defineEmits<{
  (e: 'marker-click', activityId: string): void;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
const markers: Record<string, L.Marker> = {};
const coordsCache = ref<Record<string, [number, number]>>({});
let polyline: L.Polyline | null = null;

// Create custom numbered icon
const createNumberedIcon = (number: number, isActive: boolean) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-wrapper" style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${isActive ? '<div class="marker-pulse" style="position: absolute; width: 44px; height: 44px; background: rgba(37, 99, 235, 0.3); border-radius: 50%; animation: pulse 2s infinite;"></div>' : ''}
        <div style="
          background: ${isActive ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : 'rgba(255, 255, 255, 0.9)'};
          backdrop-filter: blur(8px);
          color: ${isActive ? 'white' : '#1e293b'};
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 14px;
          border: 2px solid ${isActive ? 'rgba(255,255,255,0.8)' : 'rgba(37, 99, 235, 0.4)'};
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform: ${isActive ? 'scale(1.2)' : 'scale(1)'};
          z-index: 2;
        ">
          ${number}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
};

// Initialize Map
const initMap = () => {
  if (!mapContainer.value) return;

  // Default: Taipei (fallback)
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
  if (polyline) {
    polyline.remove();
    polyline = null;
  }

  if (props.activities.length === 0) return;

  const bounds = L.latLngBounds([]);
  let hasValidCoords = false;
  const routePoints: [number, number][] = [];

  for (let index = 0; index < props.activities.length; index++) {
    const activity = props.activities[index];
    // Prioritize lat/lon from DB if available (future proofing), then cache, then try to geocode
    let lat = activity.latitude || activity.start_location_lat;
    let lng = activity.longitude || activity.start_location_lng;

    // Try cache if missing
    if ((!lat || !lng) && coordsCache.value[activity.id]) {
      [lat, lng] = coordsCache.value[activity.id];
    }

    // Geocode if still missing and has location
    if ((!lat || !lng) && activity.location) {
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
        <div style="padding: 4px; min-width: 150px;">
          <h3 style="font-weight: bold; margin-bottom: 4px; color: #111827;">${activity.name}</h3>
          <p style="font-size: 12px; color: #6B7280; margin: 0;">${activity.location}</p>
        </div>
      `)
      .on('click', () => {
        emit('marker-click', activity.id);
      });

    markers[activity.id] = marker;
    bounds.extend([lat, lng]);
    routePoints.push([lat, lng]);
    hasValidCoords = true;
  }

  // Draw Route
  if (props.showRoute && routePoints.length > 1) {
    polyline = L.polyline(routePoints, {
      color: '#2563eb',
      weight: 4,
      opacity: 0.6,
      dashArray: '1, 10',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
  }

  // Only fit bounds on initial load or major updates if we have coords
  if (hasValidCoords && !props.highlightedId) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
};

const focusOnActivity = (activityId: string) => {
  const index = props.activities.findIndex(a => a.id === activityId);
  if (index !== -1 && map) {
    const activity = props.activities[index];
    
    // Get coords from activity or cache
    let lat = activity.latitude || activity.start_location_lat;
    let lng = activity.longitude || activity.start_location_lng;
    
    if (!lat || !lng) {
      const cached = coordsCache.value[activity.id];
      if (cached) {
        [lat, lng] = cached;
      }
    }

    if (lat && lng) {
      map.setView([lat, lng], 15, {
        animate: true,
        duration: 0.5
      });
      markers[activity.id]?.openPopup();
    }
  }
};

const fitBounds = () => {
  if (!map || props.activities.length === 0) return;
  
  const bounds = L.latLngBounds([]);
  let hasPoints = false;

  props.activities.forEach(activity => {
    let lat = activity.latitude || activity.start_location_lat;
    let lng = activity.longitude || activity.start_location_lng;

    if (!lat || !lng) {
       const cached = coordsCache.value[activity.id];
       if (cached) [lat, lng] = cached;
    }

    if (lat && lng) {
      bounds.extend([lat, lng]);
      hasPoints = true;
    }
  });
  
  if (hasPoints) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
};

defineExpose({ focusOnActivity, fitBounds });

watch(() => props.activities, () => {
  // Re-run update when activities change
  updateMarkers();
}, { deep: true });

watch(() => props.highlightedId, (newId) => {
  if (newId) {
    focusOnActivity(newId);
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
:deep(.custom-marker) {
  background: transparent;
  border: none;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(37, 99, 235, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
  }
}
</style>
