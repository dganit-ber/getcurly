import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { clientIpHash } from "@/lib/ipHash";
import { allowWrite } from "@/lib/writeGuard";

export const runtime = "nodejs";

const fail = (reason: string, status: number) =>
  NextResponse.json({ ok: false, reason }, { status });

/**
 * She confirmed our list matches the bottle in her hand.
 *
 * Only 'match' and 'stale' arrive here. A real mismatch needs a photo first
 * (rule 8), so it goes through the label scan and never through this route —
 * "it doesn't match" without evidence is a weaker signal that can flag a record
 * as stale but must never rewrite a verdict.
 *
 * `log_product_check` inserts the row; a trigger moves `last_checked_at` and
 * `check_count`, so there is nothing to update here by hand.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return fail("bad_product_id", 400);
  const productId = Number(id);

  let ipHash: string;
  try {
    ipHash = clientIpHash(req);
  } catch {
    return fail("server_misconfigured", 500);
  }

  const body = await req.json().catch(() => null);
  const result = body?.result;
  if (result !== "match" && result !== "stale") return fail("bad_result", 400);

  const supabase = createServerSupabaseClient();

  const allowed = await allowWrite(supabase, ipHash, "check");
  if (allowed === null) return fail("server_error", 500);
  if (!allowed) return fail("rate_limited", 429);

  const { error } = await supabase.rpc("log_product_check", {
    p_product_id: productId,
    p_result: result,
    p_scan_id: null,
    p_ip_hash: ipHash,
  });
  if (error) return fail("server_error", 500);

  return NextResponse.json({ ok: true });
}
