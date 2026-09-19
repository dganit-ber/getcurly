import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { clientIpHash } from "@/lib/ipHash";
import { buildScanItems } from "@/lib/labelScan";
import { isProductBarcode } from "@/lib/barcode";
import type { ManualScanFailure, ManualScanResponse } from "@/types";

export const runtime = "nodejs";

/** Long enough for any real INCI name, short enough not to be a paste target. */
const MAX_TEXT = 120;

/** A label that long is a paste of something else. */
const MAX_ITEMS = 120;

/**
 * Below this we don't publish a verdict.
 *
 * Lower than the photo path's ten, because this is her reading the bottle rather
 * than a camera guessing at it — a short list she typed is a short list, not a
 * half-read one. Not zero, though: three ingredients can't represent a shampoo,
 * and a Clear worked out from a fragment is the one failure that really costs us.
 */
const MIN_ITEMS = 5;

const fail = (reason: ManualScanFailure, status: number, extra: { count?: number } = {}) =>
  NextResponse.json({ ok: false, reason, ...extra } satisfies ManualScanResponse, { status });

/**
 * The list, typed.
 *
 * Reached from a photo that only caught part of the label. Everything after the
 * words themselves is the photo path exactly — `buildScanItems` does the
 * matching, `record_label_scan` works out the verdict — so a typed list and a
 * read one are judged by the same rules and land on the same verdict page. Only
 * `kind` differs, which is what lets us tell them apart later.
 */
export async function POST(req: Request) {
  let ipHash: string;
  try {
    ipHash = clientIpHash(req);
  } catch (err) {
    console.error("cannot hash client IP:", err);
    return fail("server_misconfigured", 500);
  }

  const body = await req.json().catch(() => null);
  if (!body) return fail("bad_body", 400);

  const raw = Array.isArray(body.items) ? body.items : [];
  if (raw.length > MAX_ITEMS) return fail("bad_body", 400);

  const items: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") return fail("bad_body", 400);
    const text = entry.trim().replace(/\s+/g, " ");
    if (text.length > MAX_TEXT) return fail("bad_body", 400);
    if (text) items.push(text);
  }

  if (items.length < MIN_ITEMS) return fail("too_few", 422, { count: items.length });

  const supabase = createServerSupabaseClient();

  // Rejoined rather than matched one by one, so the tokenizer sees the same
  // shape it sees on a label — and a row she typed as "Water (Aqua)" is split
  // the same way here as it would be off the bottle.
  const text = items.join(", ");
  const scanItems = await buildScanItems(supabase, text);
  if (scanItems.length < MIN_ITEMS) {
    return fail("too_few", 422, { count: scanItems.length });
  }

  // Both carried from the scan she was in the middle of: the barcode she
  // couldn't find, or the product whose label she came to re-read.
  const rawId = body.productId;
  const productId =
    typeof rawId === "string" && /^\d+$/.test(rawId) ? Number(rawId) : null;
  const barcode =
    typeof body.barcode === "string" && isProductBarcode(body.barcode)
      ? body.barcode
      : null;

  const { data, error } = await supabase.rpc("record_label_scan", {
    p_items: scanItems,
    p_product_id: productId,
    p_barcode: barcode,
    p_raw_ocr: text,
    p_ip_hash: ipHash,
    // Rule 11 keeps the pair of machine read and human correction as training
    // data. This one has no machine half, and 'manual' is how that stays clear.
    p_kind: "manual",
  });

  if (error) {
    console.error("record_label_scan failed:", error);
    return error.message.includes("rate limited")
      ? fail("rate_limited", 429)
      : fail("server_error", 500);
  }

  const row = (data as { scan_id: number; verdict: string }[] | null)?.[0];
  if (!row) return fail("server_error", 500);

  return NextResponse.json({
    ok: true,
    scanId: row.scan_id,
    verdict: row.verdict as "clear" | "skip",
    count: scanItems.length,
  } satisfies ManualScanResponse);
}
