import { createClient } from "@supabase/supabase-js";

/**
 * Anon-key client for reads from Server Components.
 *
 * Every read policy in the schema is `using (true)` — a scan and its verdict are
 * public by design, since `/s/[scanId]` is meant to be shareable. Reading with
 * the anon key rather than the service role keeps that surface honest: a bug
 * here can only ever see what the policies already allow anyone to see.
 *
 * Writes never come through this client. They go to a route handler that hashes
 * the IP and calls `check_rate_limit`.
 */
export const createReadClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
