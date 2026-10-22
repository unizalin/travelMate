// Only observation cities are stored here; no accommodation or member data.
export const TRIP_NIGHT_CITIES = Object.freeze({
 '2026-10-30':'reykjavik', '2026-10-31':'reykjavik',
 '2026-11-01':'golden', '2026-11-02':'vik',
 '2026-11-03':'jokulsarlon', '2026-11-04':'jokulsarlon',
 '2026-11-05':'reykjavik', '2026-11-06':'keflavik',
})
export const TRIP_PUSH_EXPIRY = '2026-11-07T12:00:00.000Z'
export function tripNightCity(night) { return Object.hasOwn(TRIP_NIGHT_CITIES,night) ? TRIP_NIGHT_CITIES[night] : null }
