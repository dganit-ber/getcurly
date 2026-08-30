import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { extname } from "path";
import { createServerSupabaseClient, LABELS_BUCKET } from "@/lib/supabase/server";
import { getVisionClient } from "@/lib/vision";
import { matchIngredients } from "@/lib/matchIngredients";
import { ingredients } from "@/lib/ingredients";
import type { UploadResponse } from "@/types";

// `@google-cloud/vision` and the Supabase upload both need the Node.js runtime.
export const runtime = "nodejs";

const failure: Extract<UploadResponse, { success: false }> = {
  success: false,
  err: "oops",
  data: "no results",
};

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(failure);
    }

    // 1. Store the label image in Supabase Storage (replaces the old S3 upload).
    const supabase = createServerSupabaseClient();
    const key = `${randomUUID()}${extname(file.name) || ".jpg"}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(LABELS_BUCKET)
      .upload(key, bytes, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("supabase storage upload failed:", uploadError);
      return NextResponse.json(failure);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(LABELS_BUCKET).getPublicUrl(key);

    // 2. OCR the stored image with Google Vision.
    const [result] = await getVisionClient().textDetection(publicUrl);
    const textAnnotations = result.textAnnotations ?? [];

    // 3. Match detected text against the "bad ingredient" list (verbatim logic).
    const matched = matchIngredients(textAnnotations, ingredients);

    return NextResponse.json({ data: [matched] } satisfies UploadResponse);
  } catch (err) {
    console.error("error in /api/upload:", err);
    return NextResponse.json(failure);
  }
}
