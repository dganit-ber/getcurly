import { NextResponse } from "next/server";
import { getVisionClient } from "@/lib/vision";
import { matchIngredients } from "@/lib/matchIngredients";
import { ingredients } from "@/lib/ingredients";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UploadResponse } from "@/types";
import { rateLimit, clientKey } from "@/lib/rateLimit";

// `@google-cloud/vision` needs the Node.js runtime.
export const runtime = "nodejs";

/** Vision bills per request, so cap what we're willing to send. */
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const fail = (err: string): Extract<UploadResponse, { success: false }> => ({
  success: false,
  err,
  data: "no results",
});

/**
 * Log the scan as evidence about a product. Deliberately not an update to the
 * products row — a scan is what one person's bottle said, and it only becomes
 * the stored verdict when promoted. Failure here must not break the scan the
 * user asked for, so it's logged and swallowed.
 */
const logScan = async (
  productId: number,
  text: string,
  cgApproved: string,
): Promise<void> => {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("scans").insert({
      product_id: productId,
      ingredients_text: text,
      cg_approved: cgApproved,
    });
    if (error) throw error;
  } catch (err) {
    console.error("could not log scan:", err);
  }
};

export async function POST(req: Request) {
  try {
    const limit = rateLimit(clientKey(req));
    if (!limit.ok) {
      return NextResponse.json(fail("too many requests"), {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter) },
      });
    }
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(fail("no file"), { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json(fail("empty file"), { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(fail("file too large"), { status: 413 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(fail("unsupported file type"), { status: 415 });
    }

    // Set when the user arrived from a product card. Anything unparseable is
    // treated as a plain scan rather than an error.
    const rawId = form.get("productId");
    const productId =
      typeof rawId === "string" && /^\d+$/.test(rawId) ? Number(rawId) : null;

    // OCR the uploaded image bytes directly - no storage involved.
    const bytes = Buffer.from(await file.arrayBuffer());
    const [result] = await getVisionClient().textDetection({
      image: { content: bytes },
    });
    const textAnnotations = result.textAnnotations ?? [];

    // Match detected text against the "bad ingredient" list (verbatim logic).
    const matched = matchIngredients(textAnnotations, ingredients);

    const fullText = textAnnotations[0]?.description ?? "";
    if (productId !== null && fullText) {
      await logScan(
        productId,
        fullText,
        matched.length === 0 ? "true" : "false",
      );
    }

    return NextResponse.json({ data: [matched] } satisfies UploadResponse);
  } catch (err) {
    console.error("error in /api/upload:", err);
    return NextResponse.json(fail("oops"), { status: 500 });
  }
}
