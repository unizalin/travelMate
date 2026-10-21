import { supabase } from '@/services/supabase'
import type { JourneyRpcClient } from '@/services/journeyService'
const client = supabase as unknown as JourneyRpcClient
export interface ActivityComment {
  id: string
  parentId: string | null
  content: string
  authorName: string | null
  memberId: string | null
  createdAt: string
}
function parseComment(value: unknown): ActivityComment {
  if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string'
    || !('parentId' in value) || (value.parentId !== null && typeof value.parentId !== 'string')
    || !('content' in value) || typeof value.content !== 'string'
    || !('authorName' in value) || (value.authorName !== null && typeof value.authorName !== 'string')
    || !('memberId' in value) || (value.memberId !== null && typeof value.memberId !== 'string')
    || !('createdAt' in value) || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) throw new Error('留言格式無效，請重新整理。')
  return { id: value.id, parentId: value.parentId, content: value.content, authorName: value.authorName, memberId: value.memberId, createdAt: value.createdAt }
}
const messages: Record<string, string> = {
  journey_access_required: '目前無法查看這份行程的留言。',
  journey_editor_required: '目前帳號僅可閱讀留言。',
  comment_invalid: '請輸入 1～2000 字的留言。',
  activity_not_found: '找不到這個活動，請重新整理行程。',
  reply_not_found: '找不到要回覆的留言，請重新整理。',
  comment_request_conflict: '這則留言的送出狀態有變，請重新整理後再試。',
}
async function invoke(name: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.rpc(name, args)
  if (error) throw new Error(messages[error.message] ?? '留言暫時無法連線，內容仍保留，請稍後重試。')
  return data
}
export async function loadActivityComments(tripId: string, activityId: string): Promise<ActivityComment[]> {
  const data = await invoke('tripbook_list_comments', { p_trip_id: tripId, p_activity_id: activityId })
  if (!Array.isArray(data)) throw new Error('留言格式無效，請重新整理。')
  return data.map(parseComment)
}
export async function postActivityComment(input: { tripId: string; activityId: string; requestId: string; parentId: string | null; content: string }): Promise<ActivityComment> {
  if (!input.content.trim() || input.content.length > 2000) throw new Error(messages.comment_invalid)
  return parseComment(await invoke('tripbook_post_comment', { p_trip_id: input.tripId, p_activity_id: input.activityId, p_request_id: input.requestId, p_parent_id: input.parentId, p_content: input.content.trim() }))
}
