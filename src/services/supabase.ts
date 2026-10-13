import type { Database } from '@/types/database'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Public pages must remain usable when cloud configuration is intentionally
 * absent.  Keep the failure lazy and typed as a regular Supabase error so
 * existing callers can surface it through their normal error UI.
 */
export const supabaseConfigurationError = {
  name: 'SupabaseConfigurationError',
  message: 'Supabase is not configured for this build',
  code: 'SUPABASE_NOT_CONFIGURED',
}

const unavailableQuery = (): unknown =>
  new Proxy(
    {},
    {
      get(_target, property) {
        if (property === 'then') {
          return (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
            Promise.resolve({ data: null, error: supabaseConfigurationError }).then(resolve, reject)
        }
        return () => unavailableQuery()
      },
    },
  )

const inertSupabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithOtp: async () => ({ data: null, error: supabaseConfigurationError }),
    signInWithOAuth: async () => ({ data: null, error: supabaseConfigurationError }),
    signUp: async () => ({ data: null, error: supabaseConfigurationError }),
  },
  rpc: async () => ({ data: null, error: supabaseConfigurationError }),
  from: () => unavailableQuery(),
}

export const supabase: SupabaseClient<Database> = supabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : (inertSupabase as unknown as SupabaseClient<Database>)
