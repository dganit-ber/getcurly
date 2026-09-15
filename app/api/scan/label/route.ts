import { NextResponse } from "next/server";
import { getVisionClient } from "@/lib/vision";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { clientIpHash } from "@/lib/ipHash";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { buildScanItems } from "@/lib/labelScan";
import { looksLikeIngredientList, splitLabelText } from "@/lib/labelTokens";
import type { LabelScanFailure, LabelScanResponse } from "@/types";

// `@google-cloud/vision` needs the Node.js runtime.
export const runtime = "nodejs";

/** Vision bills per request, so cap what we're willing to send. */
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Below this we don't publish a verdict at all. A part-read list is worse than
 * no answer: the ingredients that got cut off are exactly the ones that would
 * have turned a Clear into a Skip.
 */
const MIN_ITEMS = 10;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const fail = (reason: LabelScanFailure, status: number, extra: { count?: number } = {}) =>
  NextResponse.json({ ok: false, reason, ...extra } satisfies LabelScanResponse, { status });

export async function POST(req: Request) {
  let ipHash: string;
  try {
    ipHash = clientIpHash(req);
  } catch (err) {
    // Missing IP_HASH_SALT. Rule 13 isn't optional, so refuse rather than
    // write an unattributable row the rate limiter can't bucket.
    console.error("cannot hash client IP:", err);
    return fail("server_misconfigured", 500);
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) return fail("no_file", 400);
  if (file.size === 0) return fail("no_file", 400);
  if (file.size > MAX_BYTES) return fail("too_large", 413);
  if (!ALLOWED_TYPES.has(file.type)) return fail("unsupported_type", 415);

  // Guard the Vision spend before we pay for it. `record_label_scan` enforces the
  // real, shared limit — but it only runs after OCR is already billed, so without
  // something here an abuser gets unmetered Vision calls. This can't be the DB
  // ledger: `write_events.action` is a closed list with no key for "we are about
  // to call Vision", and reusing 'scan' would double-count every real scan and
  // silently halve her budget. So it stays the cheap in-memory speed bump it was
  // built to be, with the database as the authority.
  const limit = rateLimit(clientKey(req));
  if (!limit.ok) return fail("rate_limited", 429);

  const supabase = createServerSupabaseClient();

  // OCR the uploaded bytes directly — no storage, the photo isn't kept.
  let rawText: string;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const [result] = await getVisionClient().textDetection({
      image: { content: bytes },
    });
    rawText = result.textAnnotations?.[0]?.description ?? "";
  } catch (err) {
    console.error("vision failed:", err);
    return fail("ocr_down", 502);
  }

  if (!rawText.trim()) return fail("no_text", 422);

  // Checked before the item count, so a photo of something else entirely is told
  // what's actually wrong rather than "we only caught part of the list" — and
  // before the matching round trips, which it would only waste.
  const tokens = splitLabelText(rawText);
  if (!looksLikeIngredientList(tokens)) return fail("not_a_label", 422);

  const items = await buildScanItems(supabase, rawText);
  if (items.length < MIN_ITEMS) return fail("partial", 422, { count: items.length });

  // Set when she arrived from a product page to re-read its label.
  const rawId = form.get("productId");
  const productId =
    typeof rawId === "string" && /^\d+$/.test(rawId) ? Number(rawId) : null;

  const { data, error } = await supabase.rpc("record_label_scan", {
    p_items: items,
    p_product_id: productId,
    p_barcode: null,
    p_raw_ocr: rawText,
    p_ip_hash: ipHash,
    p_kind: "label",
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
    count: items.length,
  } satisfies LabelScanResponse);
}
