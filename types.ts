export interface Ingredient {
  type: string;
  /** Canonical INCI name. This is what the UI displays. */
  name: string;
  /**
   * Alternative spellings that mean the same ingredient — sulphate/sulfate,
   * hyphenation, punctuation variants, and eventually non-Latin forms.
   * Never shown to the user; only used for matching.
   */
  aliases?: string[];
  description: string;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  type: string;
  cg_approved: string | null;
  code?: string | null;
  created_at?: string;
  barcode: string | null;
  ingredients_text: string | null;
  verified_at: string | null;
  source: string | null;
}

/**
 * Response shape of POST /api/upload. Kept identical to the old Express `/upload`
 * endpoint so the Uploader grouping logic did not have to change:
 *  - success: `{ data: [matchedIngredients] }`
 *  - failure: `{ success: false, err: "oops", data: "no results" }`
 */
export type UploadResponse =
  | { data: [Ingredient[]] }
  | { success: false; err: string; data: string };

/**
 * Response shape of POST /api/scan/label.
 *
 * The failure reasons are a closed list because the UI owes her three visibly
 * different screens (rule: errors say what happened and what to do) — a partial
 * read, nothing readable, and our reader being down are not the same problem.
 */
export type LabelScanFailure =
  | "no_file"
  | "too_large"
  | "unsupported_type"
  | "rate_limited"
  | "ocr_down"
  | "no_text"
  | "not_a_label"
  | "partial"
  | "server_error"
  | "server_misconfigured";

export type LabelScanResponse =
  | { ok: true; scanId: number; verdict: "clear" | "skip"; count: number }
  | { ok: false; reason: LabelScanFailure; count?: number };

/**
 * Typing the list instead of photographing it. Fewer ways to fail than the
 * photo path — there is no file, no upload and no OCR, so what's left is the
 * words themselves and the limits every write shares.
 */
export type ManualScanFailure =
  | "bad_body"
  | "too_few"
  | "rate_limited"
  | "server_error"
  | "server_misconfigured";

export type ManualScanResponse =
  | { ok: true; scanId: number; verdict: "clear" | "skip"; count: number }
  | { ok: false; reason: ManualScanFailure; count?: number };

/**
 * One row of the typeahead.
 *
 * A name and nothing else. What group it falls in is deliberately absent —
 * rule 2 — and it would leak one anyway: a list that only ever suggested the
 * flagged ingredients would be a warning dressed as a convenience.
 */
export interface IngredientSuggestion {
  name: string;
}
