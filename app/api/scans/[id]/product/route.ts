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
    .select("id, barcode")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return fail("unknown_product", 404);

  const { data: scan } = await supabase
    .from("scans")
    .select("barcode")
    .eq("id", scanId)
    .maybeSingle();

  const { error: linkError } = await supabase
    .from("scans")
    .update({ product_id: productId })
    .eq("id", scanId);
  if (linkError) return fail("server_error", 500);

  // She scanned a code we didn't have, read the label instead, and has now told
  // us which bottle it is. Writing that code onto the listing is what makes the
  // next scan of it instant — without this she gets "we don't have it yet" for
  // the bottle she just named.
  //
  // Only onto a listing with no code of its own: overwriting one would quietly
  // repoint it at a different bottle. `products.barcode` is unique, so a code
  // already held elsewhere simply fails here, and the `is null` filter keeps two
  // people naming the same bottle at once from racing. Either way the link above
  // — the part she asked for — stands.
  const carried = (scan as { barcode: string | null } | null)?.barcode ?? null;
  if (carried && !(product as { barcode: string | null }).barcode) {
    await supabase
      .from("products")
      .update({ barcode: carried })
      .eq("id", productId)
      .is("barcode", null);
  }

  // Her read is now evidence about this product. Promotion decides on its own
  // terms whether that's enough; a failure here must not lose her the link.
  await supabase.rpc("maybe_promote_product", { p_product_id: productId });

  return NextResponse.json({ ok: true, productId });
}
