import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

export const runtime = "nodejs";

// Search covers the whole database, verified or not — if someone is looking for
// a specific product, a stale entry is more useful than no entry. The UI marks
// freshness per row.
export async function GET(req: Request) {
  try {
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
    if (!q) return NextResponse.json([]);

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, brand, type, cg_approved, verified_at, source")
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
      .order("verified_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json((data ?? []) as Product[]);
  } catch (err) {
    console.error("error in GET /api/products/search:", err);
    return NextResponse.json([], { status: 500 });
  }
}
