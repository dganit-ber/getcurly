import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { clientIpHash } from "@/lib/ipHash";
import { allowWrite } from "@/lib/writeGuard";

export const runtime = "nodejs";

const fail = (reason: string, status: number) =>
  NextResponse.json({ ok: false, reason }, { status });

/**
 * She confirmed which bottle this is.
 *
 * Attaching the scan is what turns a list we read into evidence about a named
 * product — and `maybe_promote_product` is what decides whether that evidence
 * is yet enough to call the listing confirmed (rule 10). It never is on the
 * first agreement, which is the point.
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
  const productId = Number(body?.productId);
  if (!Number.isInteger(productId) || productId < 1) return fail("bad_product", 400);

  const supabase = createServerSupabaseClient();

  const allowed = await allowWrite(supabase, ipHash, "add_product");
  if (allowed === null) return fail("server_error", 500);
  if (!allowed) return fail("rate_limited", 429);

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return fail("unknown_product", 404);

  const { error: linkError } = await supabase
    .from("scans")
    .update({ product_id: productId })
    .eq("id", scanId);
  if (linkError) return fail("server_error", 500);

  // Her read is now evidence about this product. Promotion decides on its own
  // terms whether that's enough; a failure here must not lose her the link.
  await supabase.rpc("maybe_promote_product", { p_product_id: productId });

  return NextResponse.json({ ok: true, productId });
}
