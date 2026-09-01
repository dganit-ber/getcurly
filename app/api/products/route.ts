import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

export const runtime = "nodejs";

// Browse list: only products that pass the method, verified ones first, capped.
// Someone landing on /search wants usable options, not the whole table. Search
// still covers everything, so a "Skip" product is findable by name.
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("cg_approved", "true")
      .order("verified_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json((data ?? []) as Product[]);
  } catch (err) {
    console.error("error in GET /api/products:", err);
    return NextResponse.json([], { status: 500 });
  }
}

// Was: POST /addproduct -> addProduct(productName, brandname, producttype, fitsSystem)
// The old client sent `fitsSystem` as the value stored in the `cg_approved` column.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = body.productName;
    const brand = body.brandname;
    const type = body.productType;
    const cg_approved = body.fitsSystem ?? null;

    if (!name || !brand || !type) {
      return NextResponse.json({ success: false });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .insert({ name, brand, type, cg_approved, source: "manual" })
      .select("name")
      .single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (err) {
    console.error("error in POST /api/products:", err);
    return NextResponse.json({ success: false });
  }
}
