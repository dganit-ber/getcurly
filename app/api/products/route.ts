import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createReadClient } from "@/lib/supabase/read";
import { clientIpHash } from "@/lib/ipHash";
import { allowWrite } from "@/lib/writeGuard";
import { createProduct } from "@/lib/products";
import type { Product } from "@/lib/db.types";

export const runtime = "nodejs";

const fail = (reason: string, status: number) =>
  NextResponse.json({ ok: false, reason }, { status });

const MAX_FIELD = 120;

const clean = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text.length > 0 && text.length <= MAX_FIELD ? text : null;
};

// Browse list: only products a real scan has confirmed, newest first. Someone
// landing here wants usable options, not the whole table — search still covers
// everything, so a Skip product stays findable by name.
export async function GET() {
  const supabase = createReadClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .not("verified_at", "is", null)
    .order("verified_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json((data ?? []) as Product[]);
}

/**
 * Create a listing.
 *
 * Rule 9: a barcode is not a product — brand, name and type are all required,
 * and the type must be one of the closed list. Rule 10: nothing is published on
 * submit, so the row is written unverified and waits for a second scan to agree.
 */
export async function POST(req: Request) {
  let ipHash: string;
  try {
    ipHash = clientIpHash(req);
  } catch {
    return fail("server_misconfigured", 500);
  }

  const body = await req.json().catch(() => null);
  if (!body) return fail("bad_body", 400);

  const brand = clean(body.brand);
  const name = clean(body.name);
  const type = clean(body.type);
  if (!brand) return fail("brand_required", 400);
  if (!name) return fail("name_required", 400);
  if (!type) return fail("type_required", 400);

  const size = body.size === null || body.size === undefined ? null : clean(body.size);
  const barcode =
    body.barcode === null || body.barcode === undefined ? null : clean(body.barcode);

  const scanId =
    body.scanId === null || body.scanId === undefined ? null : Number(body.scanId);
  if (scanId !== null && (!Number.isInteger(scanId) || scanId < 1)) {
    return fail("bad_scan_id", 400);
  }

  const supabase = createServerSupabaseClient();

  const allowed = await allowWrite(supabase, ipHash, "add_product");
  if (allowed === null) return fail("server_error", 500);
  if (!allowed) return fail("rate_limited", 429);

  const created = await createProduct(supabase, {
    brand,
    name,
    type,
    size,
    barcode,
    scanId,
  });
  if (!created.ok) {
    return fail(created.reason, created.reason === "bad_type" ? 400 : 500);
  }

  return NextResponse.json({ ok: true, productId: created.productId });
}
