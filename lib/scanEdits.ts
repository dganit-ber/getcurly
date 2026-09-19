import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolved, unresolved } from "@/lib/labelScan";
import type {
  IngredientMatch,
  ScanIngredient,
  ScanItemInput,
  Verdict,
} from "@/lib/db.types";

/** One row she retyped. `pos` is the position on the scan she was looking at. */
export interface ScanEdit {
  pos: number;
  text: string;
}

/**
 * One she typed in herself. `before` is the position it belongs above on the
 * scan she was looking at, or null to append.
 *
 * Position is roughly concentration (rule 5), so where an addition lands is
 * part of what it means: a sulfate the photo missed is a different bottle at #2
 * than at #22. Appending everything would have made the list wrong in exactly
 * the way this screen tells her matters.
 */
export interface ScanAddition {
  text: string;
  before: number | null;
}

export interface ReviseScanInput {
  scanId: number;
  ipHash: string;
  edits: ScanEdit[];
  removed: number[];
  /** Ingredients the photo missed, each where she put it. */
  added: ScanAddition[];
}

export interface RevisedScan {
  scanId: number;
  verdict: Verdict;
}

/**
 * Apply her corrections to a scan and work the verdict out again.
 *
 * Rule 11: this never updates the scan she was looking at. `fork_scan` copies
 * it, the edits land on the copy, and the answer appears at a new URL — so we
 * keep the pair (what the machine read, what a person corrected), which is the
 * training data behind `ingredient_aliases`.
 *
 * Returns null when the fork or the recompute failed. The caller reports that
 * as an error and leaves her original verdict standing, which is always the
 * safe direction.
 */
export const reviseScan = async (
  supabase: SupabaseClient,
  { scanId, ipHash, edits, removed, added }: ReviseScanInput,
): Promise<RevisedScan | null> => {
  const { data: forked, error: forkError } = await supabase.rpc("fork_scan", {
    p_scan_id: scanId,
    p_ip_hash: ipHash,
  });
  if (forkError || typeof forked !== "number") return null;

  const { data: rows, error: readError } = await supabase
    .from("scan_ingredients")
    .select("*")
    .eq("scan_id", forked)
    .order("pos", { ascending: true });
  if (readError || !rows) return null;

  const items = await applyEdits(
    supabase,
    rows as ScanIngredient[],
    { edits, removed, added },
  );
  if (items.length === 0) return null;

  // Rewritten wholesale rather than patched row by row: removals leave gaps in
  // `pos`, and closing them in place would collide with the (scan_id, pos)
  // unique constraint halfway through. The fork is ours alone, so replacing its
  // rows is safe and keeps the numbering she sees contiguous.
  const { error: clearError } = await supabase
    .from("scan_ingredients")
    .delete()
    .eq("scan_id", forked);
  if (clearError) return null;

  const { error: insertError } = await supabase.from("scan_ingredients").insert(
    items.map((item) => ({
      scan_id: forked,
      pos: item.position,
      raw_text: item.raw_text,
      ingredient_id: item.ingredient_id ?? null,
      resolved_name: item.resolved_name ?? null,
      category: item.category ?? "unknown",
      water_soluble: item.water_soluble ?? null,
      match_score: item.match_score ?? null,
      match_via: item.match_via ?? "none",
      candidates: item.candidates ?? [],
      resolution: item.resolution ?? "auto",
    })),
  );
  if (insertError) return null;

  // fork_scan copied the verdict from before these edits, so it has to be
  // worked out again now the rows have changed.
  const { data: verdict, error: verdictError } = await supabase.rpc("compute_verdict", {
    p_scan_id: forked,
  });
  if (verdictError || !verdict) return null;

  // fork_scan copies ingredient_count from the parent, so a removal or an
  // addition would leave it describing the wrong list.
  const { error: saveError } = await supabase
    .from("scans")
    .update({ verdict, ingredient_count: items.length })
    .eq("id", forked);
  if (saveError) return null;

  return { scanId: forked, verdict: verdict as Verdict };
};

/**
 * Build the new list: drop what she removed, re-match what she retyped, put
 * what the photo missed where she put it, then renumber 1..N.
 *
 * Renumbering is not re-sorting (rule 5) — the order she saw is preserved
 * exactly; only the gaps left by a removal are closed.
 */
const applyEdits = async (
  supabase: SupabaseClient,
  rows: ScanIngredient[],
  { edits, removed, added }: Pick<ReviseScanInput, "edits" | "removed" | "added">,
): Promise<ScanItemInput[]> => {
  const gone = new Set(removed);
  const edited = new Map(edits.map((edit) => [edit.pos, edit.text]));

  const kept = rows.filter((row) => !gone.has(row.pos));

  // Every text that needs looking up, in one pass — an edited row's new wording
  // and an appended row are the same problem.
  const texts = [
    ...kept.filter((row) => edited.has(row.pos)).map((row) => edited.get(row.pos)!),
    ...added.map((addition) => addition.text),
  ];
  const matches = await matchTexts(supabase, texts);

  // Matches come back in the order the texts went out: every edit, then every
  // addition. The additions are indexed separately because they're emitted out
  // of order — each one at its own anchor rather than all at the end.
  const editMatches = matches.slice(0, texts.length - added.length);
  const addMatches = matches.slice(texts.length - added.length);

  const items: ScanItemInput[] = [];
  let next = 0;
  const placed = new Set<number>();

  const insertAt = (anchor: number | null) => {
    added.forEach((addition, i) => {
      if (addition.before !== anchor || placed.has(i)) return;
      placed.add(i);
      items.push(shape(addition.text, items.length + 1, addMatches[i], "user_added"));
    });
  };

  for (const row of kept) {
    insertAt(row.pos);

    const text = edited.get(row.pos);
    if (text === undefined) {
      // Untouched: carry it across as it stands, at its new number.
      items.push({ ...toItem(row), position: items.length + 1 });
      continue;
    }
    items.push(shape(text, items.length + 1, editMatches[next++], "user_typed"));
  }

  // Appended: the ones she put at the end, and any whose anchor she removed in
  // the same pass — dropping those would silently throw away something she
  // typed, which is worse than putting it last.
  insertAt(null);
  added.forEach((addition, i) => {
    if (placed.has(i)) return;
    items.push(shape(addition.text, items.length + 1, addMatches[i], "user_added"));
  });

  return items;
};

/**
 * A row she typed carries her resolution, not `auto` — that distinction is what
 * `scan_open_questions` reads to know it must never interrupt her about a word
 * she has already corrected by hand.
 */
const shape = (
  text: string,
  position: number,
  matches: IngredientMatch[],
  resolution: "user_typed" | "user_added",
): ScanItemInput => {
  const item =
    matches.length > 0
      ? resolved(text, position, matches)
      : unresolved(text, position);
  return { ...item, resolution, match_via: matches.length > 0 ? "user" : "none" };
};

/** One round trip for the whole edit where the bulk function is available. */
const matchTexts = async (
  supabase: SupabaseClient,
  texts: string[],
): Promise<IngredientMatch[][]> => {
  if (texts.length === 0) return [];

  const { data, error } = await supabase.rpc("match_ingredients_bulk", {
    p_texts: texts,
  });

  if (!error && data) {
    const byInput = new Map<number, IngredientMatch[]>();
    for (const row of data as (IngredientMatch & { input_index: number })[]) {
      const list = byInput.get(row.input_index) ?? [];
      list.push(row);
      byInput.set(row.input_index, list);
    }
    return texts.map((_, i) => byInput.get(i + 1) ?? []);
  }

  return Promise.all(
    texts.map(async (text) => {
      const one = await supabase.rpc("match_ingredient", { p_text: text });
      return one.error ? [] : ((one.data ?? []) as IngredientMatch[]);
    }),
  );
};

const toItem = (row: ScanIngredient): ScanItemInput => ({
  position: row.pos,
  raw_text: row.raw_text,
  ingredient_id: row.ingredient_id,
  resolved_name: row.resolved_name,
  category: row.category,
  water_soluble: row.water_soluble,
  match_score: row.match_score,
  match_via: row.match_via ?? "none",
  candidates: row.candidates,
  resolution: row.resolution,
});
