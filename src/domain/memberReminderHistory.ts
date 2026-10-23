export type MemberReminderStage = 'install' | 'aurora'
const seen = new Set<MemberReminderStage>()
const key = (stage: MemberReminderStage) => `travelmate:member-reminder:seen:${stage}:v1`
export function wasMemberReminderShown(stage: MemberReminderStage): boolean {
  if (seen.has(stage)) return true
  try { return localStorage.getItem(key(stage)) === '1' } catch { return false }
}
export function markMemberReminderShown(stage: MemberReminderStage): void {
  seen.add(stage)
  try { localStorage.setItem(key(stage), '1') } catch { /* Keep this opening quiet when storage is unavailable. */ }
}
