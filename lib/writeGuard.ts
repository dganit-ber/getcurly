import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Every write path goes through `check_rate_limit` so they share one ledger in
 * the database, rather than each route keeping its own count in module memory
 * (which a serverless instance loses, and which three warm instances triple).
 *
 * Allowances are per hour, per hashed IP (rule 13) — generous enough that a
 * real person correcting a label never meets one.
 */
const ALLOWANCE = {
  edit_list: 40,
  add_product: 10,
  check: 30,
} as const;

export type WriteAction = keyof typeof ALLOWANCE;

/**
 * Returns false when she's over the limit, and null when the check itself
 * failed — the caller must treat those differently: over the limit is a 429 she
 * can wait out, a broken check is a 500 and never a silent allow.
 */
export const allowWrite = async (
  supabase: SupabaseClient,
  ipHash: string,
  action: WriteAction,
): Promise<boolean | null> => {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_ip_hash: ipHash,
    p_action: action,
    p_max: ALLOWANCE[action],
    p_window: "01:00:00",
  });

  if (error) return null;
  return data === true;
};
