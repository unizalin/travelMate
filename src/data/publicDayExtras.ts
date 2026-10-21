import { preciseMapTerms } from './icelandHandbook'

/**
 * Public day-page extras assembled from the supplied photo book.
 * Nav terms are parking-level Google Maps search terms: the book-supplied
 * terms come from icelandHandbook.preciseMapTerms; the entries below extend
 * the same pattern to the remaining public stops. Inter-stop drive rows
 * were removed on 2026-10-21 by user decision — the page keeps the pure
 * itinerary, with stay windows shown via planned start/end times.
 */
export const publicNavTerms: Record<string, string> = {
  ...preciseMapTerms,
  'Kerið': 'Kerið Crater Parking',
  'Dyrhólaey': 'Dyrhólaey Parking',
  'Reynisfjara': 'Reynisfjara Parking',
  'Diamond Beach': 'Diamond Beach Parking',
  'Ytri Tunga': 'Ytri Tunga Parking',
  'Arnarstapi': 'Arnarstapi Parking',
  'Ingjaldshólskirkja': 'Ingjaldshólskirkja',
  'Sky Lagoon': 'Sky Lagoon',
  'Costco': 'Costco Wholesale Iceland',
  'Vestrahorn': 'Vestrahorn, Stokksnes',
  'Zodiac': 'Ice Lagoon Zodiac Boat Tours',
  'Blue Lagoon': 'Blue Lagoon Parking',
  'Hallgrímskirkja': 'Hallgrímskirkja',
  'Black Crust': 'Black Crust Pizzeria',
  'Vatnajökull': 'Vatnajökull',
  'Reykjavík City Walk': 'Reykjavík Old Town',
  'Volcano': 'Reykjanes',
}

export function publicNavTerm(name: string): string | undefined {
  return Object.entries(publicNavTerms).find(([key]) => name.includes(key))?.[1]
}

/**
 * Written-in fuel / toilet stops per Iceland day (2026-10-21 user decision:
 * hardcode the stops, each opening Google Maps for navigation — same Maps
 * search URL pattern as the attraction navigation links). Entries are named
 * service towns and attraction visitor facilities along that day's confirmed
 * route; the Maps query resolves the actual station at tap time.
 */
export interface PublicDayService { kind: 'fuel' | 'toilet'; label: string; query: string }
export const publicDayServices: Record<string, PublicDayService[]> = {
  '2026-10-30': [
    { kind: 'toilet', label: 'KEF 機場', query: 'Keflavík International Airport' },
    { kind: 'fuel', label: 'Costco Garðabær', query: 'Costco petrol station Garðabær Iceland' },
  ],
  '2026-10-31': [
    { kind: 'fuel', label: 'Borgarnes', query: 'gas station Borgarnes Iceland' },
    { kind: 'fuel', label: 'Grundarfjörður', query: 'gas station Grundarfjörður Iceland' },
  ],
  '2026-11-01': [
    { kind: 'fuel', label: 'Laugarvatn', query: 'gas station Laugarvatn Iceland' },
  ],
  '2026-11-02': [
    { kind: 'fuel', label: 'Vík', query: 'gas station Vík Iceland' },
  ],
  '2026-11-03': [
    { kind: 'fuel', label: 'Kirkjubæjarklaustur', query: 'gas station Kirkjubæjarklaustur Iceland' },
  ],
  '2026-11-04': [
    { kind: 'fuel', label: 'Höfn（最近城鎮）', query: 'gas station Höfn Iceland' },
    { kind: 'toilet', label: 'Hali 集合點', query: 'Glacier Adventure Hali Iceland' },
    { kind: 'toilet', label: 'Jökulsárlón 停車場', query: 'Jökulsárlón Main Parking' },
  ],
  '2026-11-05': [
    { kind: 'fuel', label: 'Kirkjubæjarklaustur', query: 'gas station Kirkjubæjarklaustur Iceland' },
    { kind: 'fuel', label: 'Vík', query: 'gas station Vík Iceland' },
    { kind: 'fuel', label: 'Selfoss', query: 'gas station Selfoss Iceland' },
    { kind: 'toilet', label: 'Vík', query: 'Vík Iceland' },
  ],
  '2026-11-06': [
    { kind: 'fuel', label: 'Grindavík', query: 'gas station Grindavík Iceland' },
  ],
  '2026-11-07': [
    { kind: 'fuel', label: 'Keflavík（還車前）', query: 'gas station Keflavík Iceland' },
    { kind: 'toilet', label: 'KEF 機場', query: 'Keflavík International Airport' },
  ],
}
export function publicServiceMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/**
 * Toilets anchored to the stop they belong to (2026-10-21 user refinement:
 * show each toilet at its nearest itinerary point, inside that stop, rather
 * than only in the day-level list). Keyed by a stop-name fragment, matched
 * like publicNavTerm. Fuel stays in the day-level list above — a fuel stop
 * is an on-the-way point, not part of a stop. Toilets with no matching stop
 * (airport, pass-through towns) also stay in the day-level list.
 */
export const publicStopServices: Record<string, PublicDayService> = {
  'Arnarstapi': { kind: 'toilet', label: 'Arnarstapi', query: 'Arnarstapi Iceland' },
  'Kirkjufellsfoss': { kind: 'toilet', label: 'Grundarfjörður', query: 'Grundarfjörður Iceland' },
  'Þingvellir': { kind: 'toilet', label: 'Þingvellir 訪客中心', query: 'Þingvellir Visitor Centre' },
  'Strokkur': { kind: 'toilet', label: 'Geysir 訪客中心', query: 'Geysir Visitor Centre' },
  'Gullfoss': { kind: 'toilet', label: 'Gullfoss 訪客中心', query: 'Gullfoss Visitor Centre' },
  'Seljalandsfoss': { kind: 'toilet', label: 'Seljalandsfoss 停車場', query: 'Seljalandsfoss Parking' },
  'Skógafoss': { kind: 'toilet', label: 'Skógafoss 停車場', query: 'Skógafoss Parking' },
  'Reynisfjara': { kind: 'toilet', label: 'Reynisfjara 停車場', query: 'Reynisfjara Parking' },
  'Fjaðrárgljúfur': { kind: 'toilet', label: 'Fjaðrárgljúfur 停車場', query: 'Fjaðrárgljúfur Parking' },
  'Diamond Beach': { kind: 'toilet', label: 'Jökulsárlón 停車場', query: 'Jökulsárlón Main Parking' },
  'Hallgrímskirkja': { kind: 'toilet', label: 'Hallgrímskirkja 周邊', query: 'Hallgrímskirkja Reykjavík' },
  'Blue Lagoon': { kind: 'toilet', label: 'Blue Lagoon', query: 'Blue Lagoon Iceland' },
}
export function publicStopService(name: string): PublicDayService | undefined {
  return Object.entries(publicStopServices).find(([key]) => name.includes(key))?.[1]
}
