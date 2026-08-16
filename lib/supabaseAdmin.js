import { createClient } from "@supabase/supabase-js";

// Server-only client using the service_role key, which bypasses Row Level
// Security entirely. Never import this from a Client Component — the key
// must never reach the browser. Our own admin session auth (bcrypt +
// signed cookie) is what actually gates writes; RLS is left enabled on
// every table as a second line of defense in case the anon key is ever
// used directly.
let client;

export function getSupabaseAdmin() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      );
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
