import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service-role key. Used only inside API
 * route handlers for Storage uploads and `products` writes/reads. Never import
 * this from a client component.
 */
export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const LABELS_BUCKET = process.env.SUPABASE_LABELS_BUCKET || "labels";
