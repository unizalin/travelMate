import { TRIP_PUSH_EXPIRY } from '../../shared/aurora-trip.mjs'
export function proactiveReminders(input: { member: boolean; standalone: boolean; enabled: boolean; date: string }) {
 if (!input.member || input.enabled || Date.parse(input.date) >= Date.parse(TRIP_PUSH_EXPIRY)) return { install: false, aurora: false }
 if (!input.standalone) return { install: true, aurora: false }
 return { install: false, aurora: !input.enabled }
}
