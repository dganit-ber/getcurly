import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

export const runtime = "nodejs";

// Was: GET /getLastProducts.json -> getLastProducts() ("SELECT * FROM products ORDER BY id desc")
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) throw error;
    return NextResponse.json((data ?? []) as Product[]);
  } catch (err) {
    console.error("error in GET /api/products:", err);
    return NextResponse.json([], { status: 500 });
  }
}

// Was: POST /addproduct -> addProduct(productName, brandname, productType, fitsSystem)
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
      .insert({ name, brand, type, cg_approved })
      .select("name")
      .single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (err) {
    console.error("error in POST /api/products:", err);
    return NextResponse.json({ success: false });
  }
}
