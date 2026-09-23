import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses row-level security.
 *
 * SERVER ONLY. The "server-only" import above makes the build fail if this
 * module is ever pulled into a client component, rather than leaking the
 * secret key into the browser bundle.
 *
 * Needed by the public subscribe flow: anonymous visitors are allowed to
 * INSERT into subscribers but not to SELECT from it, so reading back the
 * new row's unsubscribe_token (for the welcome email) requires elevated
 * access. Use the ordinary client in @/lib/supabase/server everywhere else.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase service client needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
