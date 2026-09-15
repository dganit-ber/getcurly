import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IngredientMatch, MatchCandidate, ScanItemInput } from "@/lib/db.types";
import { tokenizeLabel, type LabelToken } from "@/lib/labelTokens";

/** A label runs to 30-60 ingredients; this keeps it to a few round trips. */
const CHUNK = 20;

const chunked = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/**
 * `match_ingredient` returns `inci_name`; a stored candidate is keyed `name`.
 * Translating here rather than at the call site keeps the stored shape the one
 * `scan_open_questions` and PickCard both read.
 */
const toCandidate = (match: IngredientMatch): MatchCandidate => ({
  ingredient_id: match.ingredient_id,
  name: match.inci_name,
  category: match.category,
  water_soluble: match.water_soluble,
});

/**
 * An unmatched token is still a row. It keeps the label's positions honest, it
 * shows up on the "what we counted" list as what the camera read, and it feeds
 * the unresolved index that becomes the dictionary backlog. It carries category
 * 'unknown', which `ingredient_is_flagged` treats as benign — so a word we don't
 * know can never invent a Skip.
 */
const unresolved = (token: string, position: number): ScanItemInput => ({
  position,
  raw_text: token,
  ingredient_id: null,
  resolved_name: null,
  category: "unknown",
  water_soluble: null,
  match_score: null,
  match_via: "none",
  candidates: [],
  resolution: "unresolved",
});

const resolved = (
  token: string,
  position: number,
  matches: IngredientMatch[],
): ScanItemInput => {
  const [best] = matches;
  return {
    position,
    raw_text: token,
    ingredient_id: best.ingredient_id,
    resolved_name: best.inci_name,
    category: best.category,
    water_soluble: best.water_soluble,
    match_score: best.score,
    match_via: best.via,
    // Kept whole, not just the winner: `scan_open_questions` compares the
    // runners-up against the row we picked to decide whether to interrupt her.
    candidates: matches.map(toCandidate),
    resolution: "auto",
  };
};

/**
 * Turn a label's OCR text into the rows `record_label_scan` stores.
 *
 * Matching happens in the database so the same rules apply here, in the backfill
 * script, and in SQL run by hand. Position is the token's place on the label and
 * is never re-sorted — it's roughly concentration (rule 5).
 */
export const buildScanItems = async (
  supabase: SupabaseClient,
  rawText: string,
): Promise<ScanItemInput[]> => {
  const tokens = tokenizeLabel(rawText);
  if (tokens.length === 0) return [];

  const bulk = await matchAllAtOnce(supabase, tokens);
  return bulk ?? matchOneAtATime(supabase, tokens);
};

/**
 * Pick between the two readings of a wrapped token by which one the dictionary
 * recognises better. `match_ingredient` scores exact 1.0, alias 0.98 and fuzzy
 * by similarity, so the highest best-score is the better reading. Neither
 * matching leaves it unresolved, which is benign.
 */
const bestOf = (lists: IngredientMatch[][]): IngredientMatch[] =>
  lists.reduce<IngredientMatch[]>((best, list) => {
    if (list.length === 0) return best;
    if (best.length === 0) return list;
    return list[0].score > best[0].score ? list : best;
  }, []);

/**
 * The whole label in a single round trip. Returns null when the function isn't
 * there yet (migration 0005 not run), so the caller can fall back rather than
 * fail — remove that fallback once it's deployed everywhere.
 */
const matchAllAtOnce = async (
  supabase: SupabaseClient,
  tokens: LabelToken[],
): Promise<ScanItemInput[] | null> => {
  // Both readings of a wrapped token go in the same request — it's one round
  // trip either way, so asking costs nothing.
  const probes: string[] = [];
  const ownerOf: number[] = [];
  tokens.forEach((token, i) => {
    for (const reading of [token.text, ...token.alternates]) {
      probes.push(reading);
      ownerOf.push(i);
    }
  });

  const { data, error } = await supabase.rpc("match_ingredients_bulk", {
    p_texts: probes,
  });
  if (error || !data) return null;

  // Rows arrive flat, best-first within each index; regroup by probe position.
  const byProbe = new Map<number, IngredientMatch[]>();
  for (const row of data as (IngredientMatch & { input_index: number })[]) {
    const list = byProbe.get(row.input_index) ?? [];
    list.push(row);
    byProbe.set(row.input_index, list);
  }

  const readings = tokens.map(() => [] as IngredientMatch[][]);
  probes.forEach((_, p) => readings[ownerOf[p]].push(byProbe.get(p + 1) ?? []));

  return tokens.map((token, i) => {
    const matches = bestOf(readings[i]);
    // raw_text stays the spaced reading — it's what the camera saw. When the
    // glued reading won, the canonical name comes back as resolved_name anyway.
    return matches.length > 0
      ? resolved(token.text, i + 1, matches)
      : unresolved(token.text, i + 1);
  });
};

/** One request per ingredient. Correct but slow; kept only as the fallback. */
const matchOneAtATime = async (
  supabase: SupabaseClient,
  tokens: LabelToken[],
): Promise<ScanItemInput[]> => {
  const items: ScanItemInput[] = [];

  for (const batch of chunked(tokens, CHUNK)) {
    const offset = items.length;
    const settled = await Promise.all(
      batch.map(async (token, i): Promise<ScanItemInput> => {
        const position = offset + i + 1; // pos is 1-indexed and must be > 0
        const readings = [token.text, ...token.alternates];

        const lists = await Promise.all(
          readings.map(async (reading) => {
            const { data, error } = await supabase.rpc("match_ingredient", {
              p_text: reading,
            });
            // One failed lookup shouldn't cost her the whole scan — an
            // unresolved row is benign, so the verdict stays correct.
            return error ? [] : ((data ?? []) as IngredientMatch[]);
          }),
        );

        const matches = bestOf(lists);
        return matches.length > 0
          ? resolved(token.text, position, matches)
          : unresolved(token.text, position);
      }),
    );
    items.push(...settled);
  }

  return items;
};
