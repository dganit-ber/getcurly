import { NextResponse } from "next/server";
import { createReadClient } from "@/lib/supabase/read";
import type { IngredientSuggestion } from "@/types";

export const runtime = "nodejs";

/** Enough to choose from without becoming a list she has to read. */
const SUGGESTIONS = 8;

/** Fetched before ranking, so a prefix match buried alphabetically still wins. */
const POOL = 40;

/**
 * The ingredients we can offer her, as she types.
 *
 * Not the `ingredients` table: that is the judgement dictionary, which holds the
 * six flagged groups and little else, so autocompleting from it would offer
 * sulfates and silicones and nothing for "aqua" — useless, and a category hint
 * per row besides (rule 2). `search_ingredient_names` reads the union of that
 * dictionary with every name we have actually seen on a label (migration 0011).
 *
 * A read: no rate limit, no write, and a failure degrades to a plain field.
 */
export async function GET(req: Request) {
  try {
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
    // Two letters is where the results stop being the whole dictionary.
    if (q.length < 2) return NextResponse.json([]);

    const supabase = createReadClient();
    const { data, error } = await supabase.rpc("search_ingredient_names", {
      p_query: q,
      p_limit: SUGGESTIONS,
    });

    // Before 0011 is run the function isn't there. Fall back to the dictionary
    // rather than fail: narrow suggestions beat none, and the field takes
    // anything she types regardless.
    if (error) return NextResponse.json(await fromDictionary(supabase, q));

    const suggestions = (data as { name: string }[] | null) ?? [];
    return NextResponse.json(
      suggestions.map((row): IngredientSuggestion => ({ name: row.name })),
    );
  } catch (err) {
    // An empty list degrades to a plain text field, which still works.
    console.error("error in GET /api/ingredients/search:", err);
    return NextResponse.json([], { status: 500 });
  }
}

/** The pre-0011 source: the flagged dictionary alone, ranked the same way. */
const fromDictionary = async (
  supabase: ReturnType<typeof createReadClient>,
  q: string,
): Promise<IngredientSuggestion[]> => {
  const { data } = await supabase
    .from("ingredients")
    .select("inci_name")
    .ilike("inci_name", `%${q}%`)
    .limit(POOL);

  const key = q.toLowerCase();
  return ((data as { inci_name: string }[] | null) ?? [])
    // What she typed is usually the start of the name; shorter first after
    // that, so the plain ingredient comes before its derivatives.
    .sort((a, b) => {
      const lead =
        Number(!a.inci_name.toLowerCase().startsWith(key)) -
        Number(!b.inci_name.toLowerCase().startsWith(key));
      return lead !== 0 ? lead : a.inci_name.length - b.inci_name.length;
    })
    .slice(0, SUGGESTIONS)
    .map((row) => ({ name: row.inci_name }));
};
