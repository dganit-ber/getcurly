// lib/db.types.ts
//
// Hand-written to match supabase/migration/0004_rewrite_foundation.sql. You can
// also generate them:
//   npx supabase gen types typescript --project-id <ref> > lib/supabase.types.ts
// Keep these as the app-facing shapes either way — the generated file is noisy and
// doesn't carry the function return types in a useful form.

export type Verdict = "clear" | "skip";

export type IngredientCategory =
  | "sulfate"
  | "silicone"
  | "drying_alcohol"
  | "mineral_oil"
  | "wax"
  | "cg_safe"
  | "neutral";

/** scan_ingredients.category adds "unknown" — we read it but have no entry. */
export type ScanIngredientCategory = IngredientCategory | "unknown";

export type ProductSource = "obf" | "scan" | "manual";
export type ScanKind = "label" | "barcode" | "manual" | "recheck";
export type CheckResult = "match" | "mismatch" | "stale";
export type Resolution = "auto" | "user_picked" | "user_typed" | "user_added" | "unresolved";
export type MatchVia = "exact" | "alias" | "fuzzy" | "user" | "none";

/** product_confidence().tier — drives whether a verdict may be shown at all. */
export type ConfidenceTier = "no_list" | "seed_only" | "fresh" | "aging" | "unchecked";

export type ProductTypeFamily = "cleanse" | "condition" | "style" | "treat";

export interface ProductType {
  slug: string;
  label: string;
  family: ProductTypeFamily;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  /** a product_types.slug */
  type: string;
  cg_approved: string | null;
  code: string | null;
  created_at: string;
  added_by: string | null;
  barcode: string | null;
  ingredients_text: string | null;
  verified_at: string | null;
  source: ProductSource | null;
  verified_by: string | null;
  // added by 0004_rewrite_foundation.sql
  ingredients_read_at: string | null;
  last_checked_at: string | null;
  last_checked_by: string | null;
  check_count: number;
  mismatch_count: number;
  stale_flag_count: number;
  current_scan_id: number | null;
  verdict: Verdict | null;
}

/**
 * products_like_scan(scan_id) — bottles whose stored list looks like this scan's.
 *
 * `matched` of `total` is what the screen says out loud ("36 of 37 ingredients
 * identical"), so it is the count itself, not a percentage she has to interpret.
 */
export interface ProductCandidate {
  product_id: number;
  brand: string;
  name: string;
  type: string;
  matched: number;
  total: number;
  score: number;
}

export interface Ingredient {
  id: number;
  inci_name: string;
  normalized_name: string;
  category: IngredientCategory;
  /** only meaningful for silicones: dimethicone false, dimethiconol true */
  water_soluble: boolean;
  description: string | null;
  created_at: string;
}

export interface Scan {
  id: number;
  product_id: number | null;
  barcode: string | null;
  kind: ScanKind;
  raw_ocr_text: string | null;
  ingredient_count: number | null;
  verdict: Verdict | null;
  /** set when this scan is an edit of another. Scans are append-only. */
  parent_scan_id: number | null;
  is_edited: boolean;
  created_by: string | null;
  ip_hash: string | null;
  created_at: string;
}

/** One candidate match for an ingredient we couldn't read cleanly. */
export interface MatchCandidate {
  ingredient_id: number;
  name: string;
  category: ScanIngredientCategory;
  water_soluble: boolean | null;
}

export interface ScanIngredient {
  id: number;
  scan_id: number;
  /** 1-based, as printed. `position` is reserved in Postgres, hence `pos`. */
  pos: number;
  /** what OCR produced. Never shown to the user. */
  raw_text: string;
  ingredient_id: number | null;
  /** what we counted. THIS is what the UI shows. */
  resolved_name: string | null;
  category: ScanIngredientCategory;
  water_soluble: boolean | null;
  match_score: number | null;
  match_via: MatchVia | null;
  candidates: MatchCandidate[];
  resolution: Resolution;
  affects_verdict: boolean;
  created_at: string;
}

export interface ProductCheck {
  id: number;
  product_id: number;
  result: CheckResult;
  /** required when result is 'mismatch' — enforced by a check constraint */
  scan_id: number | null;
  checked_by: string | null;
  ip_hash: string | null;
  created_at: string;
}

export interface ProductIngredientVersion {
  id: number;
  product_id: number;
  scan_id: number | null;
  ingredients_text: string | null;
  ingredients: { position: number; name: string; category: string }[];
  verdict: Verdict | null;
  read_at: string;
  /** null on exactly one row per product: the current list */
  superseded_at: string | null;
  created_at: string;
}

export interface AffiliateLink {
  id: number;
  product_id: number;
  retailer_slug: string;
  url: string;
  price_cents: number | null;
  currency: string;
  in_stock: boolean | null;
  checked_at: string | null;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  kicker: string | null;
  excerpt: string | null;
  body_md: string | null;
  hero_image: string | null;
  published_at: string | null;
}

// ---------------------------------------------------------------------------
// Function return shapes
// ---------------------------------------------------------------------------

/** match_ingredient(text) — candidates, best first */
export interface IngredientMatch {
  ingredient_id: number;
  inci_name: string;
  category: IngredientCategory;
  water_soluble: boolean;
  score: number;
  via: MatchVia;
}

/** verdict_reasons(scan_id) — what the Skip screen lists, in label order */
export interface VerdictReason {
  pos: number;
  resolved_name: string | null;
  category: ScanIngredientCategory;
  resolution: Resolution;
}

/**
 * scan_open_questions(scan_id)
 *
 * Returns a row ONLY when a word we couldn't read cleanly has candidates that
 * disagree on the verdict. An empty array is the normal case and means: show
 * nothing. This is the single condition under which the UI interrupts her.
 */
export interface OpenQuestion {
  pos: number;
  raw_text: string;
  chosen_name: string | null;
  candidates: MatchCandidate[];
}

/** product_confidence(product_id) — drives the last-checked line and rule 7 */
export interface ProductConfidence {
  tier: ConfidenceTier;
  list_read_at: string | null;
  checked_at: string | null;
  checks: number;
  days_since: number | null;
  score: number;
}

/** latest_product_diff(product_id) / diff_product_versions(old, new) */
export interface IngredientDiffRow {
  change: "gone" | "new" | "moved" | "same";
  name: string;
  old_pos: number | null;
  new_pos: number | null;
  category: string;
}

/** cg_safe_alternatives(product_id, limit) — already ordered. Do not re-sort. */
export interface Alternative {
  product_id: number;
  name: string;
  brand: string;
  type: string;
  check_count: number;
  price_cents: number | null;
  retailer_name: string | null;
  url: string | null;
}

/** the payload record_label_scan expects, one per ingredient, in label order */
export interface ScanItemInput {
  position: number;
  raw_text: string;
  ingredient_id?: number | null;
  resolved_name?: string | null;
  category?: ScanIngredientCategory;
  water_soluble?: boolean | null;
  match_score?: number | null;
  match_via?: MatchVia;
  candidates?: MatchCandidate[];
  resolution?: Resolution;
}
