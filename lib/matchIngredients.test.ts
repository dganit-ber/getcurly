import { describe, it, expect } from "vitest";
import { matchIngredients, type TextAnnotation } from "./matchIngredients";
import { ingredients } from "./ingredients";

/** Build the annotation array the way Google Vision returns it: entry 0 is the full block. */
const annotate = (fullText: string): TextAnnotation[] => [{ description: fullText }];

describe("matchIngredients", () => {
  it("flags a label containing known bad ingredients", () => {
    const label = annotate(
      "Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Dimethicone, Parfum"
    );
    const result = matchIngredients(label, ingredients);
    const names = result.map((r) => r.name);

    expect(names).toContain("sodium laureth sulfate");
    expect(names).toContain("dimethicone");
  });

  it("returns an empty list for a clean label", () => {
    const label = annotate("Aqua, Cocamidopropyl Betaine, Glycerin, Citric Acid, Parfum");
    expect(matchIngredients(label, ingredients)).toHaveLength(0);
  });

  it("returns an empty list when there is no detected text", () => {
    expect(matchIngredients([], ingredients)).toHaveLength(0);
    expect(matchIngredients(annotate(""), ingredients)).toHaveLength(0);
  });
});
