import type { AuroraCityId } from '../src/domain/auroraConditions'
export const TRIP_NIGHT_CITIES: Readonly<Record<string, AuroraCityId>>
export const TRIP_PUSH_EXPIRY: string
export function tripNightCity(night: string): AuroraCityId | null
