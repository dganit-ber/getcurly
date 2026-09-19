import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

export const runtime = "nodejs";

// Search covers the whole database, verified or not — if someone is looking for
// a specific product, a stale entry is more useful than no entry. The UI marks
// freshness per row.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const q = (params.get("q") ?? "").trim();
    const type = params.get("type");
    if (!q) return NextResponse.json([]);

    const supabase = createServerSupabaseClient();
    let search = supabase
      .from("products")
      .select("id, name, brand, type, cg_approved, verified_at, source")
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`);

    // Rule 9's closed list, used as a filter: the type is what makes "a
    // cleanser that does the same job without a sulfate" a question we can
    // answer, so it has to be a way of narrowing what she's looking at too.
    if (type) search = search.eq("type", type);

    const { data, error } = await search
      .order("verified_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json((data ?? []) as Product[]);
  } catch (err) {
    console.error("error in GET /api/products/search:", err);
    return NextResponse.json([], { status: 500 });
  }
}
