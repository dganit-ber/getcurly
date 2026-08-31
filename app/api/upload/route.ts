import { NextResponse } from "next/server";
import { getVisionClient } from "@/lib/vision";
import { matchIngredients } from "@/lib/matchIngredients";
import { ingredients } from "@/lib/ingredients";
import type { UploadResponse } from "@/types";

// `@google-cloud/vision` needs the Node.js runtime.
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

    // OCR the uploaded image bytes directly - no storage involved.
    const bytes = Buffer.from(await file.arrayBuffer());
    const [result] = await getVisionClient().textDetection({
      image: { content: bytes },
    });
    const textAnnotations = result.textAnnotations ?? [];

    // Match detected text against the "bad ingredient" list (verbatim logic).
    const matched = matchIngredients(textAnnotations, ingredients);

    return NextResponse.json({ data: [matched] } satisfies UploadResponse);
  } catch (err) {
    console.error("error in /api/upload:", err);
    return NextResponse.json(failure);
  }
}
