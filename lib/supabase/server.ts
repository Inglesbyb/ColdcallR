import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 * Only use in Route Handlers, Server Components, or Server Actions.
 * NEVER expose this client to the browser.
 */
export function getSupabaseServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, serviceRoleKey ?? anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
