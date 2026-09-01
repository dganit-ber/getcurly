import type { Ingredient } from "@/types";

/** Minimal shape of a Google Vision text annotation entry we rely on. */
export interface TextAnnotation {
  description?: string | null;
}

/**
 * Collapse the spelling differences that appear on real labels so the list
 * only needs one entry per ingredient:
 *   - British "sulphate"/"sulphonate" -> American "sulfate"/"sulfonate"
 *   - punctuation, hyphens and spaces removed, so "sodium coco-sulfate",
 *     "sodium coco sulfate" and "alcohol denat." all normalise alike
 */
const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/sulph/g, "sulf")
    .replace(/[^a-z0-9]/g, "");

/**
 * Given the `textAnnotations` array returned by Google Vision `textDetection`,
 * return the "bad" ingredients from `ingredientList` that appear on the label.
 *
 * The first annotation holds the full detected text block. It is split on
 * newlines and commas, each token normalised, and compared against every known
 * ingredient's name and aliases.
 */
export function matchIngredients(
  textAnnotations: TextAnnotation[],
  ingredientList: Ingredient[],
): Ingredient[] {
  const fullText = textAnnotations[0]?.description ?? "";
  if (!fullText) return [];

  // Regex that removes line breaks. Superimportant, do not delete.
  const tokens = new Set(fullText.split(/[\n,]+/).map(normalize));

  return ingredientList.filter(
    (ingredient) =>
      tokens.has(normalize(ingredient.name)) ||
      ingredient.aliases?.some((alias) => tokens.has(normalize(alias))),
  );
}
