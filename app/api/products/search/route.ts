import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

export const runtime = "nodejs";

// Was: POST /getinput/:product.json -> getProductsByTyping(val)
//   "SELECT id, name, brand, type, cg_approved FROM products WHERE name ILIKE $1"  ($1 = val + "%")
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q") ?? "";
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, brand, type, cg_approved")
      .ilike("name", `${q}%`);

    if (error) throw error;
    return NextResponse.json((data ?? []) as Product[]);
  } catch (err) {
    console.error("error in GET /api/products/search:", err);
    return NextResponse.json([], { status: 500 });
  }
}
