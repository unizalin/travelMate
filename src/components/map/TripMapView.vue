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
  activities: any[];
  highlightedId?: string | null;
  showRoute?: boolean;
  origin?: { lat: number; lng: number; name?: string };
  destination?: { lat: number; lng: number; name?: string };
}>();

const emit = defineEmits<{
  (e: 'marker-click', activityId: string): void;
  (e: 'activity-click', activity: any): void; // Added to match usage in TripOverview
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
const markers: Record<string, L.Marker> = {};
const coordsCache = ref<Record<string, [number, number]>>({});
let polyline: L.Polyline | null = null;

// Create custom numbered icon
const createNumberedIcon = (number: number, isActive: boolean, dayNumber?: number) => {
  // Different colors for different days could be implemented here
  const color = isActive ? '#2563EB' : '#3B82F6';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        border: 2px solid white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        transition: all 0.2s ease;
        transform: ${isActive ? 'scale(1.15)' : 'scale(1)'};
        position: relative;
      ">
        <span style="line-height: 1;">${number}</span>
        ${dayNumber ? `<span style="font-size: 8px; line-height: 1; margin-top: 1px;">D${dayNumber}</span>` : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16] // Center anchor
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

  // Add Origin if present and showRoute is true
  if (props.showRoute && props.origin) {
    // Maybe add a special marker for origin? For now, we just use it for route start
    // routePoints.push([props.origin.lat, props.origin.lng]);
    // Optionally add marker for origin
     L.marker([props.origin.lat, props.origin.lng], {
        title: props.origin.name || 'Origin'
     }).addTo(map).bindPopup(props.origin.name || 'Start');
     bounds.extend([props.origin.lat, props.origin.lng]);
  }

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
    const dayNum = activity.dayNumber; // Custom prop from TripOverview
    const orderNum = activity.orderInDay || index + 1;

    const marker = L.marker(
      [lat, lng],
      { icon: createNumberedIcon(orderNum, isActive, dayNum) }
    )
      .addTo(map!)
      .bindPopup(`
        <div style="padding: 4px; min-width: 150px;">
          <h3 style="font-weight: bold; margin-bottom: 4px; color: #111827;">${activity.name}</h3>
          <p style="font-size: 12px; color: #6B7280; margin: 0;">${activity.location}</p>
          ${activity.start_time ? `<p style="font-size: 11px; color: #9CA3AF; margin-top: 2px;">${activity.start_time.substring(0, 5)}</p>` : ''}
        </div>
      `)
      .on('click', () => {
        emit('marker-click', activity.id);
        emit('activity-click', activity);
      });

    markers[activity.id] = marker;
    bounds.extend([lat, lng]);
    routePoints.push([lat, lng]);
    hasValidCoords = true;
  }

  // Draw Route
  if (props.showRoute && routePoints.length > 1) {
    polyline = L.polyline(routePoints, {
      color: '#3B82F6',
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 10', // Dashed line for route
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
  if (props.origin) {
      bounds.extend([props.origin.lat, props.origin.lng]);
      hasPoints = true;
  }

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

watch(() => props.showRoute, () => {
    updateMarkers();
});

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
      const dayNum = activity.dayNumber;
      const orderNum = activity.orderInDay || index + 1;
      marker.setIcon(createNumberedIcon(orderNum, activity.id === activeId, dayNum));
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
</style>
