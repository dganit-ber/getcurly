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
