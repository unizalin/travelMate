import { createClient } from '@supabase/supabase-js'
import { makeLineHandler } from './line-api.mjs'
import { createLineClient } from './line-client.mjs'
import { checkLineSubscribers } from './line-push.mjs'
import { cronAuthorized } from './aurora-cloud.mjs'

export default async function handler(req, res) {
  const env = process.env
  const reply = (status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)) }
  const action = new URL(req.url, 'https://localhost').searchParams.get('action')
  if (action === 'check' && !cronAuthorized(req.headers.authorization, env.CRON_SECRET)) return reply(401, { error: '未授權。' })
  const origin = env.AURORA_APP_ORIGIN, url = env.SUPABASE_URL || env.VITE_SUPABASE_URL, anon = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!origin?.startsWith('https://') || !url || !anon || !env.SUPABASE_SERVICE_ROLE_KEY || !env.LINE_CHANNEL_SECRET || !env.LINE_CHANNEL_ACCESS_TOKEN) return reply(503, { error: 'LINE 服務尚未完成設定。' })
  const timedFetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) })
  const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: timedFetch } })
  const check = result => { if (result.error) throw new Error(result.error.message); return result.data }
  const rpc = async (name, args) => check(await admin.rpc(name, args))
  const store = {
    event: (id, owner, complete) => rpc('tripbook_line_event', { p_event: id, p_owner: owner, p_complete: complete }),
    block: (id, blocked, timestamp) => rpc('tripbook_line_block', { p_line_id: id, p_blocked: blocked, p_timestamp: timestamp }),
    isMember: user => rpc('tripbook_line_is_member', { p_user_id: user }),
    createTicket: (hash, id, token) => rpc('tripbook_line_create_ticket', { p_hash: hash, p_line_id: id, p_token: token }),
    prepareLink: (hash, user, nonce) => rpc('tripbook_line_prepare_link', { p_hash: hash, p_user_id: user, p_nonce_hash: nonce }),
    finishLink: (nonce, id, ok) => rpc('tripbook_line_finish_link', { p_nonce_hash: nonce, p_line_id: id, p_ok: ok }),
    setPreference: (user, enabled) => rpc('tripbook_line_set_preference', { p_user_id: user, p_enabled: enabled }),
    unlink: user => rpc('tripbook_line_unlink', { p_user_id: user }),
    bindingForLine: async id => check(await admin.from('tripbook_line_bindings').select('*').eq('line_user_id', id).maybeSingle()),
    bindingForUser: async user => check(await admin.from('tripbook_line_bindings').select('*').eq('user_id', user).maybeSingle()),
    acquire: owner => rpc('tripbook_line_lease', { p_owner: owner, p_release: false }),
    release: owner => rpc('tripbook_line_lease', { p_owner: owner, p_release: true }),
    subscribers: async () => check(await admin.from('tripbook_line_bindings').select('user_id,link_id').eq('aurora_enabled', true).eq('blocked', false)),
    claimDelivery: (user, link, night) => rpc('tripbook_line_claim_delivery', { p_user_id: user, p_link_id: link, p_night: night }),
    sent: async (user, night) => { check(await admin.from('tripbook_line_deliveries').update({ sent: true }).eq('user_id', user).eq('night_date', night)) },
  }
  const authorize = async token => {
    const { data, error } = await admin.auth.getUser(token)
    return !error && data.user && await store.isMember(data.user.id) ? { id: data.user.id } : null
  }
  const line = createLineClient({ token: env.LINE_CHANNEL_ACCESS_TOKEN })
  return makeLineHandler({ store, line, authorize, origin, secret: env.LINE_CHANNEL_SECRET, pushEnabled: env.LINE_PUSH_ENABLED === 'true', checkNotifications: async (request, response) => {
    if (env.LINE_PUSH_ENABLED !== 'true') { response.writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store' }); response.end(JSON.stringify({ error: 'LINE 提醒尚未啟用。' })); return }
    const result = await checkLineSubscribers({ store, line, origin })
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); response.end(JSON.stringify(result))
  } })(req, res)
}
