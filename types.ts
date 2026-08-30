export interface Ingredient {
  type: string;
  name: string;
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
