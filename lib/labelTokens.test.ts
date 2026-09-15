import { describe, it, expect } from "vitest";
import { splitLabelText, looksLikeIngredientList, tokenizeLabel } from "./labelTokens";

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
    // The cap is 110: long enough to keep two ingredients OCR ran together,
    // short enough to drop a paragraph of marketing copy.
    const tokens = splitLabelText(`Aqua,,  , 12345, ${"x".repeat(120)}, Glycerin`);
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

describe("OCR line wrapping", () => {
  it("rejoins a hyphenated word broken across lines", () => {
    const tokens = splitLabelText(
      "INGREDIENTS: Aqua, BEHENTRIMONIUM METHOSUL-\nFATE, Glycerin",
    );
    expect(tokens).toEqual(["Aqua", "BEHENTRIMONIUM METHOSULFATE", "Glycerin"]);
  });

  it("rejoins a plain wrapped line into one ingredient, not two", () => {
    // The bug this fixes: a newline is where the column ran out, not a separator.
    const tokens = splitLabelText("INGREDIENTS: Aqua, COCO-GLU\nCOSIDE, Glycerin");
    expect(tokens).toHaveLength(3);
    expect(tokens[1]).toBe("COCO-GLU COSIDE");
  });

  it("drops the distributor block printed after the list", () => {
    const tokens = splitLabelText(
      "INGREDIENTS: Aqua, Glycerin, ALPHA-ISOMETHYL IONONE\nDist\nMaesa SAS",
    );
    expect(tokens).toEqual(["Aqua", "Glycerin", "ALPHA-ISOMETHYL IONONE"]);
  });

  it("keeps a run-on token rather than silently dropping the ingredients in it", () => {
    // OCR loses the odd comma. A vanished ingredient is worse than an ugly row.
    const merged = "HELIANTHUS ANNUUS (SUNFLOWER) SEED OIL MANGIFERA INDICA (MANGO) SEED BUTTER";
    expect(splitLabelText(`INGREDIENTS: Aqua, ${merged}, Glycerin`)).toContain(merged);
  });

  it("still splits a label that uses line breaks instead of commas", () => {
    expect(splitLabelText("INGREDIENTS:\nAqua\nGlycerin\nParfum")).toEqual([
      "Aqua",
      "Glycerin",
      "Parfum",
    ]);
  });
});

describe("typographic hyphens at a line break", () => {
  // Vision passes through whichever dash the label was printed with, and often
  // drops the break hyphen entirely — in which case there is no signal at all.
  it.each([
    ["ascii", "-"],
    ["non-breaking", "\u2011"],
    ["en dash", "\u2013"],
  ])("rejoins across a %s hyphen", (_label, dash) => {
    expect(splitLabelText(`INGREDIENTS: Aqua, METHOSUL${dash}\nFATE`)).toEqual([
      "Aqua",
      "METHOSULFATE",
    ]);
  });
});

describe("tokenizeLabel alternate readings", () => {
  it("offers the closed-up reading of a wrapped token", () => {
    const [, broken] = tokenizeLabel("INGREDIENTS: Aqua, DIMETHI\nCONE, Glycerin");
    expect(broken.text).toBe("DIMETHI CONE");
    expect(broken.alternates).toContain("DIMETHICONE");
  });

  it("offers the closed-up reading of a space dropped mid-word", () => {
    // No line break involved — OCR simply put a space inside the word.
    const [, broken] = tokenizeLabel("INGREDIENTS: Aqua, DIMETH ICONE, Glycerin");
    expect(broken.text).toBe("DIMETH ICONE");
    expect(broken.alternates).toContain("DIMETHICONE");
  });

  it("offers nothing extra for a single-word token", () => {
    const [first] = tokenizeLabel("INGREDIENTS: Aqua, Glycerin");
    expect(first.alternates).toEqual([]);
  });

  it("keeps a wrapped final ingredient rather than reading it as the distributor", () => {
    const tokens = splitLabelText("INGREDIENTS: Aqua, SARGASSUM\nEXTRACT");
    expect(tokens).toEqual(["Aqua", "SARGASSUM EXTRACT"]);
  });

  it("never duplicates a reading", () => {
    const [, wrapped] = tokenizeLabel("INGREDIENTS: Aqua, SARGASSUM\nEXTRACT");
    expect(new Set(wrapped.alternates).size).toBe(wrapped.alternates.length);
  });
});
