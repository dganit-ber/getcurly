import type { Ingredient } from "@/types";

/** Minimal shape of a Google Vision text annotation entry we rely on. */
export interface TextAnnotation {
  description?: string | null;
}

/**
 * Ported verbatim from the old Express `/upload` handler (index.js). Given the
 * `textAnnotations` array returned by Google Vision `textDetection`, return the
 * list of "bad" ingredients (from `ingredientList`) that appear on the label.
 *
 * The first annotation holds the full detected text block; it is lowercased,
 * split on newlines/commas, trimmed, and each known ingredient name is checked
 * for an exact match against those tokens.
 */
export function matchIngredients(
  textAnnotations: TextAnnotation[],
  ingredientList: Ingredient[]
): Ingredient[] {
  const finalRes: Ingredient[] = [];

  const ingredientsFromAPI: string[] = [];
  for (let i = 0; i < textAnnotations.length; i++) {
    ingredientsFromAPI.push((textAnnotations[i].description ?? "").toLowerCase());
  }

  if (!ingredientsFromAPI[0]) {
    return finalRes;
  }

  // Regex that removes line breaks. Superimportant, do not delete.
  const ingredientsArr = ingredientsFromAPI[0].split(/[\n,]+/);
  for (let z = 0; z < ingredientsArr.length; z++) {
    ingredientsArr[z] = ingredientsArr[z].trim();
  }

  for (let x = 0; x < ingredientList.length; x++) {
    if (ingredientsArr.includes(ingredientList[x].name)) {
      finalRes.push(ingredientList[x]);
    }
  }

  return finalRes;
}
