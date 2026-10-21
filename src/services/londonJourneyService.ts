import { supabase } from '@/services/supabase'
import { parseEnvelope, type JourneyRpcClient } from '@/services/journeyService'
const client = supabase as unknown as JourneyRpcClient
export async function addLondonPrelude(tripId: string) {
  const { data,error } = await client.rpc('tripbook_add_london_prelude',{ p_trip_id:tripId })
  if (error) throw new Error(error.message === 'journey_editor_required' ? '目前帳號沒有修改這份行程的權限。' : '倫敦前段未加入，請確認服務已更新後重試；原本行程仍保留。')
  return parseEnvelope(data)
}
