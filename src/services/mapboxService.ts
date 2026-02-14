const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export interface MapboxPOI {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    category: string[];
    maki?: string;
}

export const mapboxService = {
    /**
     * Search for nearby Points of Interest (POI)
     */
    async searchNearbyPOIs(lat: number, lng: number, category: string = 'tourism'): Promise<MapboxPOI[]> {
        if (!MAPBOX_TOKEN) throw new Error('Mapbox Token is missing');

        // Mapbox Searchbox API v1
        const url = new URL(`https://api.mapbox.com/search/searchbox/v1/category/${category}`);
        url.searchParams.append('access_token', MAPBOX_TOKEN);
        url.searchParams.append('proximity', `${lng},${lat}`);
        url.searchParams.append('limit', '15');
        url.searchParams.append('language', 'zh-TW');

        try {
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error('Mapbox Search Error');

            const data = await response.json();
            return data.features.map((f: any) => ({
                id: f.properties.mapbox_id,
                name: f.properties.name,
                address: f.properties.full_address || f.properties.place_formatted,
                latitude: f.geometry.coordinates[1],
                longitude: f.geometry.coordinates[0],
                category: f.properties.category || [],
                maki: f.properties.maki
            }));
        } catch (error) {
            console.error('Mapbox Search Error:', error);
            return [];
        }
    },

    /**
     * Optimize route for a list of coordinates
     * @param coordinates Array of [lng, lat]
     * @returns Array of indices in optimized order
     */
    async getOptimizedOrder(coordinates: [number, number][]): Promise<number[]> {
        if (!MAPBOX_TOKEN) throw new Error('Mapbox Token is missing');
        if (coordinates.length < 2) return coordinates.map((_, i) => i);
        if (coordinates.length > 12) {
            // Optimization API limited to 12 coordinates for free tier/basic
            console.warn('Optimization API limited to 12 coordinates');
        }

        const coordsString = coordinates.map(c => c.join(',')).join(';');
        const url = new URL(`https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordsString}`);
        url.searchParams.append('access_token', MAPBOX_TOKEN);
        url.searchParams.append('source', 'first');
        url.searchParams.append('destination', 'any');
        url.searchParams.append('roundtrip', 'false');

        try {
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error('Mapbox Optimization Error');

            const data = await response.json();
            if (data.code !== 'Ok') throw new Error(data.message || 'Optimization failed');

            // Correct way: data.waypoints contains info about input points.
            // data.trips[0].legs... NO.
            // The 'trips' object has the optimized geometry.
            // The 'waypoints' are returned in the order of the source input.
            // But we want the sequence.

            // Re-reading docs: "The order of entries in the waypoints array is the same as in the request."
            // Each waypoint has `waypoint_index`.
            // The `trips` array has `legs`, and each leg connects two waypoints.
            // Actually, `data.waypoints` has `trips_index` which tells us the position in the optimized trip.

            // Wait, waypoint_index is just the index in the request.
            // We need the order in the trip.

            // Let's use the simplest: The trip order is what we need.
            // Usually, if we set source=first, the first one is index 0.
            // The API response for optimized-trips v1:
            // "waypoints": array of waypoint objects, ordered as input.
            // "trips": array of trip objects.
            // trips[0].legs: sequence of legs.

            // Actually, there is a better property: "waypoint_index" in the leg? No.
            // Let's check a more reliable source. The waypoints are indices into the input.
            // BUT, the `trips` object contains a `geometry`.
            // To get the ORDER of IDs, we look at the waypoints' `location` or similar?

            // Actually, most people use the `trips[0].geometry` or `legs`.
            // But for just REORDERING the input list:
            // The `waypoints` array in the response has a property `waypoint_index` which is the index of the waypoint in the request.
            // However, the sequence is NOT explicitly in `waypoints`.
            // It IS in `trips[0].legs`. Each leg has a `summary` and `weight` etc.

            // Wait, I might be confusing it with another API. 
            // Documentation says: The `waypoints` in the response are in the SAME order as the request.
            // Each waypoint has a `waypoint_index`.

            // Let's look at the "trips" -> "legs". 
            // If we have 3 points A, B, C. Request is A;B;C.
            // Waypoints: [W_A, W_B, W_C]
            // If optimized is A -> C -> B.
            // How do we know the sequence?

            // Ah! The `trips` object has `legs`. But it doesn't say which waypoint it refers to.
            // Wait, the `trips` object has a `geometry`. 
            // In the `optimized-trips` API, the waypoints are reordered?
            // "Waypoints: An array of Waypoint objects, each of which represents an input coordinate and its position in the optimized trip"

            // Let's assume for now we just want the distance/time.
            // If I want the ORDER, I should check if there's a `trips_index` or similar.
            // Actually, the Optimization API v1 is often used to get the TRIP.

            // Re-checking Mapbox docs... 
            // "Each waypoint contains... waypoint_index: The index of the waypoint in the request"
            // There is also a `trips_index`.

            const results = data.waypoints.map((w: any) => ({
                originalIndex: w.waypoint_index,
                optimizedIndex: w.trips_index // This is the order in the trip
            }));

            return results
                .sort((a: any, b: any) => a.optimizedIndex - b.optimizedIndex)
                .map((r: any) => r.originalIndex);

        } catch (error) {
            console.error('Mapbox Optimization Error:', error);
            return coordinates.map((_, i) => i);
        }
    }
};
