import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { clientIpHash } from "@/lib/ipHash";
import type { Ingredient } from "@/lib/db.types";

export const runtime = "nodejs";

const fail = (reason: string, status: number) =>
  NextResponse.json({ ok: false, reason }, { status });

/**
 * She picked one of the two candidates on the pick card.
 *
 * Rule 11: scans are append-only. This forks the scan, applies the choice to the
 * copy, and recomputes — so we keep the pair (what the machine read, what a
 * person corrected), which is the training data for `ingredient_aliases`.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return fail("bad_scan_id", 400);
  const scanId = Number(id);

  let ipHash: string;
  try {
    ipHash = clientIpHash(req);
  } catch {
    return fail("server_misconfigured", 500);
  }

  const body = await req.json().catch(() => null);
  const pos = Number(body?.pos);
  const ingredientId = Number(body?.ingredientId);
  if (!Number.isInteger(pos) || pos < 1) return fail("bad_position", 400);
  if (!Number.isInteger(ingredientId)) return fail("bad_ingredient", 400);

  const supabase = createServerSupabaseClient();

  const { data: allowed, error: limitError } = await supabase.rpc("check_rate_limit", {
    p_ip_hash: ipHash,
    p_action: "edit_list",
    p_max: 40,
    p_window: "01:00:00",
  });
  if (limitError) return fail("server_error", 500);
  if (!allowed) return fail("rate_limited", 429);

  // The chosen ingredient decides the row's category, which is what the verdict
  // is recomputed from — so read it rather than trusting the client's copy.
  const { data: ingredient, error: ingredientError } = await supabase
    .from("ingredients")
    .select("id, inci_name, category, water_soluble")
    .eq("id", ingredientId)
    .maybeSingle();
  if (ingredientError || !ingredient) return fail("unknown_ingredient", 404);

  const chosen = ingredient as Pick<
    Ingredient,
    "id" | "inci_name" | "category" | "water_soluble"
  >;

  const { data: forked, error: forkError } = await supabase.rpc("fork_scan", {
    p_scan_id: scanId,
    p_ip_hash: ipHash,
  });
  if (forkError || typeof forked !== "number") return fail("server_error", 500);

  const { error: updateError } = await supabase
    .from("scan_ingredients")
    .update({
      ingredient_id: chosen.id,
      resolved_name: chosen.inci_name,
      category: chosen.category,
      water_soluble: chosen.water_soluble,
      match_via: "user",
      resolution: "user_picked",
    })
    .eq("scan_id", forked)
    .eq("pos", pos);
  if (updateError) return fail("server_error", 500);

  // fork_scan computed a verdict for the copy before this edit, so it has to be
  // worked out again now the row has changed.
  const { data: verdict, error: verdictError } = await supabase.rpc("compute_verdict", {
    p_scan_id: forked,
  });
  if (verdictError) return fail("server_error", 500);

  const { error: saveError } = await supabase
    .from("scans")
    .update({ verdict })
    .eq("id", forked);
  if (saveError) return fail("server_error", 500);

  return NextResponse.json({ ok: true, scanId: forked, verdict });
}
