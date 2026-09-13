/**
 * Step 3 of the rewrite: seed the new ingredients/ingredient_aliases dictionary
 * from lib/ingredients.ts, then report which distinct ingredient-text tokens
 * across the live products table still don't match anything — that report is
 * the dictionary backlog Step 5 needs to be short.
 *
 * lib/ingredients.ts groups by the old free-text `type`; the new schema's
 * ingredients.category is a closed 7-value list with no "other drying agents"
 * bucket, so the 12 entries in that group are mapped individually below
 * rather than in bulk — see CATEGORY_OVERRIDES.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfillIngredients.ts
 */
import { createClient } from "@supabase/supabase-js";
import { ingredients } from "@/lib/ingredients";
import type { IngredientCategory } from "@/lib/db.types";

const GROUP_CATEGORY: Record<string, IngredientCategory> = {
  sulfates: "sulfate",
  silicones: "silicone",
  alcohols: "drying_alcohol",
  "mineral oils": "mineral_oil",
  waxes: "wax",
};

// "other drying agents" has no equivalent bucket in the new schema (which is
// closed to sulfate | silicone | drying_alcohol | mineral_oil | wax | cg_safe
// | neutral — matching SPEC.md's "six groups"). Mapped individually to the
// closest existing category so each still counts toward a verdict; easy to
// re-categorize later, this only seeds DB rows.
const CATEGORY_OVERRIDES: Record<string, IngredientCategory> = {
  "disodium cocoyl glutamate": "sulfate",
  "emu oil": "mineral_oil",
  "etas-expandable textured aerospheres": "wax",
  "sodium carboxylate": "sulfate",
  "sodium cocoyl glutamate": "sulfate",
  "sodium cocoyl sarcosinate": "sulfate",
  "sodium lauroyl sarcosinate": "sulfate",
  "sodium lauroyl sarcosine": "sulfate",
  "sodium lauroylmethyl isethionate": "sulfate",
  "sodium lauryl sarcosinate": "sulfate",
  "sodium myristoyl sarcosinate": "sulfate",
  "witch hazel": "drying_alcohol",
};

const categoryFor = (name: string, type: string): IngredientCategory => {
  const category = CATEGORY_OVERRIDES[name] ?? GROUP_CATEGORY[type];
  if (!category) throw new Error(`No category mapping for "${name}" (${type})`);
  return category;
};

const CHUNK = 20;

const chunked = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const main = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars.");

  const supabase = createClient(url, key);

  // --- seed pass -----------------------------------------------------------
  const rows = ingredients.map((entry) => ({
    inci_name: entry.name,
    category: categoryFor(entry.name, entry.type),
  }));

  const { error: seedError } = await supabase
    .from("ingredients")
    .upsert(rows, { onConflict: "normalized_name", ignoreDuplicates: true });
  if (seedError) throw seedError;

  const { data: seeded, error: fetchError } = await supabase
    .from("ingredients")
    .select("id, inci_name")
    .in("inci_name", rows.map((r) => r.inci_name));
  if (fetchError) throw fetchError;

  const idByName = new Map(seeded?.map((r) => [r.inci_name, r.id]));

  const aliasRows = ingredients.flatMap((entry) => {
    const ingredientId = idByName.get(entry.name);
    if (!ingredientId || !entry.aliases?.length) return [];
    return entry.aliases.map((alias) => ({
      ingredient_id: ingredientId,
      alias,
      source: "manual" as const,
    }));
  });

  if (aliasRows.length > 0) {
    const { error: aliasError } = await supabase
      .from("ingredient_aliases")
      .upsert(aliasRows, { onConflict: "normalized_alias", ignoreDuplicates: true });
    if (aliasError) throw aliasError;
  }

  console.log(
    `seeded ${rows.length} ingredients, ${aliasRows.length} aliases (existing rows left untouched)`,
  );

  // --- report pass -----------------------------------------------------------
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("ingredients_text")
    .not("ingredients_text", "is", null);
  if (productsError) throw productsError;

  const frequency = new Map<string, number>();
  for (const { ingredients_text } of products ?? []) {
    if (!ingredients_text) continue;
    for (const raw of ingredients_text.split(/[\n,]+/)) {
      const token = raw.trim();
      if (!token) continue;
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }

  const tokens = [...frequency.keys()];
  const misses: { token: string; count: number }[] = [];

  for (const batch of chunked(tokens, CHUNK)) {
    const results = await Promise.all(
      batch.map((token) =>
        supabase.rpc("match_ingredient", { p_text: token }).then(({ data, error }) => {
          if (error) throw error;
          return { token, matched: (data?.length ?? 0) > 0 };
        }),
      ),
    );
    for (const { token, matched } of results) {
      if (!matched) misses.push({ token, count: frequency.get(token)! });
    }
  }

  misses.sort((a, b) => b.count - a.count);

  console.log(`\n${tokens.length} distinct ingredient-text tokens across products`);
  console.log(`${misses.length} unmatched — dictionary backlog, most frequent first:\n`);
  for (const { token, count } of misses) {
    console.log(`${String(count).padStart(4)}  ${token}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
