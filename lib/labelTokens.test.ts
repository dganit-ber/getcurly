import { describe, it, expect } from "vitest";
import { splitLabelText, looksLikeIngredientList } from "./labelTokens";

const LABEL =
  "INGREDIENTS: Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Glycerin, " +
  "Dimethicone, Parfum, Citric Acid, Sodium Benzoate, Linalool, Limonene.";

describe("splitLabelText", () => {
  it("splits on commas and drops the lead-in header", () => {
    const tokens = splitLabelText(LABEL);
    expect(tokens[0]).toBe("Aqua");
    expect(tokens).toContain("Sodium Laureth Sulfate");
    expect(tokens).toHaveLength(10);
  });

  it("strips trailing punctuation and collapses OCR spacing", () => {
    expect(splitLabelText("Aqua,  Citric   Acid.")).toEqual(["Aqua", "Citric Acid"]);
  });

  it("drops noise: empties, number-only tokens and run-on paragraphs", () => {
    const tokens = splitLabelText(`Aqua,,  , 12345, ${"x".repeat(80)}, Glycerin`);
    expect(tokens).toEqual(["Aqua", "Glycerin"]);
  });

  it("returns nothing for empty input", () => {
    expect(splitLabelText("")).toEqual([]);
  });
});

describe("looksLikeIngredientList", () => {
  it("accepts a real label", () => {
    expect(looksLikeIngredientList(splitLabelText(LABEL))).toBe(true);
  });

  it("accepts a label with no anchor word but chemical-shaped names", () => {
    const tokens = splitLabelText(
      "Cetyl Alcohol, Behentrimonium Methosulfate, Panthenol, Polyquaternium-10",
    );
    expect(looksLikeIngredientList(tokens)).toBe(true);
  });

  it("rejects prose", () => {
    const tokens = splitLabelText(
      "The quick brown fox, jumped over, the lazy dog, and then, it ran away, into the woods",
    );
    expect(looksLikeIngredientList(tokens)).toBe(false);
  });

  it("rejects an empty read", () => {
    expect(looksLikeIngredientList([])).toBe(false);
  });
});

describe("extractIngredientSection", () => {
  // What a real bottle photographs like: instructions in several languages,
  // then the INCI list last.
  const BOTTLE = [
    "(EN) Wet hair, apply and rinse.",
    "1. Trocknen Sie das Haar",
    "2. Verteilen Sie",
    "INGREDIENTS: Aqua, Glycerin, Dimethicone, Parfum",
  ].join("\n");

  it("drops packaging text before the ingredients marker", () => {
    const tokens = splitLabelText(BOTTLE);
    expect(tokens).toEqual(["Aqua", "Glycerin", "Dimethicone", "Parfum"]);
  });

  it("numbers from the first real ingredient, not the instructions", () => {
    // Position is roughly concentration, so this is the number that matters.
    expect(splitLabelText(BOTTLE).indexOf("Dimethicone") + 1).toBe(3);
  });

  it("finds the marker in other languages", () => {
    expect(splitLabelText("Bla bla\nInhaltsstoffe: Aqua, Glycerin")).toEqual([
      "Aqua",
      "Glycerin",
    ]);
  });

  it("keeps the whole read when there is no marker at all", () => {
    expect(splitLabelText("Aqua, Glycerin")).toEqual(["Aqua", "Glycerin"]);
  });
});
