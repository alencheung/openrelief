import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// server-only guard: this module exports the service-role client which
// BYPASSES Row-Level Security. Importing it into a Client Component would
// leak the service-role key to the browser. The runtime check below throws
// if this module is ever evaluated in a real browser bundle.
//
// In test (jsdom) mode the Supabase client is mocked (see jest.setup.js), so
// we skip the guard there — otherwise the jsdom `window` would trip it and
// break test collection for any module that transitively imports admin code.
//
// If you see this error in a build, the offending file is a Client Component
// ('use client') that imports supabaseAdmin — switch it to the anon client
// from '@/lib/supabase' or use createClient() from '@/lib/supabase/server'.
if (
  process.env.NODE_ENV !== 'test' &&
  (typeof window !== 'undefined' || (typeof self !== 'undefined' && self.constructor?.name === 'Window'))
) {
  throw new Error(
    "src/lib/supabase/admin.ts (supabaseAdmin) must never be imported in a browser bundle — " +
    "it uses the service-role key and bypasses RLS. Use '@/lib/supabase' (anon) or " +
    "'@/lib/supabase/server' (createAdminClient) instead."
  )
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const shouldUseMockClient =
  process.env.NODE_ENV === 'test' ||
  !supabaseUrl ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PHASE === 'phase-production-build'

// Build-safe: when env vars are absent (e.g. during `next build` page-data
// collection), fall back to a mock so module-load doesn't throw. The runtime
// guard above still prevents browser bundling.
export const supabaseAdmin: SupabaseClient<Database> = shouldUseMockClient
  ? createMockAdminClient()
  : createClient<Database>(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

// Minimal mock for test/build. Mirrors the chain in src/lib/supabase.ts.
function createMockAdminClient(): SupabaseClient<Database> {
  const noop = (): unknown => chain
  const chain = {
    select: noop, insert: noop, update: noop, upsert: noop, delete: noop,
    eq: noop, neq: noop, in: noop, gte: noop, lte: noop, gt: noop, lt: noop,
    like: noop, ilike: noop, contains: noop, not: noop, is: noop, or: noop,
    filter: noop, order: noop, limit: noop, range: noop, single: noop,
    maybeSingle: noop, rpc: noop,
    then: (resolve: (value: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null })
  }
  return {
    from: () => chain,
    auth: { getUser: async () => ({ data: { user: null }, error: null }) }
  } as unknown as SupabaseClient<Database>
}
