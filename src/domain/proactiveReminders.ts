export function proactiveReminders(input: { member: boolean; standalone: boolean; enabled: boolean; date: string }) {
 if (!input.member) return { install: false, aurora: false }
 if (!input.standalone) return { install: true, aurora: false }
 return { install: false, aurora: !input.enabled && input.date >= '2026-10-30' && input.date <= '2026-11-06' }
}
