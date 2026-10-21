import { supabase } from '@/services/supabase'
export interface JourneyRoster {
  claims: Array<{ memberId: string; name: string | null; isSelf: boolean }>
  choices: Array<{ memberId: string; flightId: string }>
}
type RpcClient = { rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }> }
const client = supabase as unknown as RpcClient
const messages: Record<string, string> = {
  journey_access_required: '此帳號尚未加入這份旅程，請聯絡建立者。',
  journey_editor_required: '需要這份旅程的編輯權限才能認領或選班。',
  member_already_claimed: '這個身分已被認領，請重新整理名單。',
  release_current_identity_first: '請先解除目前身分，再認領另一位；解除會清除自己的選班。',
  claim_identity_first: '請先認領自己的身分。',
  unknown_member: '找不到這個名字，請重新整理。',
}
export function parseRoster(data: unknown): JourneyRoster {
  const value = data as JourneyRoster | null
  if (!value || !Array.isArray(value.claims) || !Array.isArray(value.choices)
    || value.claims.some(c => !c || typeof c.memberId !== 'string' || typeof c.isSelf !== 'boolean' || (c.name !== null && typeof c.name !== 'string'))
    || value.choices.some(c => !c || typeof c.memberId !== 'string' || typeof c.flightId !== 'string')) throw new Error('名單資料格式無效，請重新整理。')
  return value
}
async function invoke(name: string, args: Record<string, unknown>) {
  const { data, error } = await client.rpc(name, args)
  if (error) throw new Error(messages[error.message] ?? '名單更新失敗，請重新整理後重試。')
  return parseRoster(data)
}
export const loadRoster = (tripId: string) => invoke('tripbook_roster', { p_trip_id: tripId })
export const claimMember = (tripId: string, memberId: string | null) => invoke('tripbook_claim_member', { p_trip_id: tripId, p_member_id: memberId })
export const chooseFlight = (tripId: string, flightId: string, selected: boolean) => invoke('tripbook_choose_flight', { p_trip_id: tripId, p_flight_id: flightId, p_selected: selected })
