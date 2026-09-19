import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isFlagged } from "./verdict";
import type { IngredientMatch, ScanIngredientCategory } from "./db.types";

/**
 * Matching rules live in Postgres, so testing them means asking Postgres.
 *
 * These run against the real dictionary and are skipped where there are no
 * credentials (CI), which is the trade for testing the thing that actually
 * decides verdicts rather than a mock of it.
 */
const loadLocalEnv = () => {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const at = line.indexOf("=");
    if (at === -1 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, at).trim();
    if (!process.env[key]) process.env[key] = line.slice(at + 1).trim();
  }
};

loadLocalEnv();

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

describe.skipIf(!configured)("match_ingredient against the real dictionary", () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  });

  const best = async (text: string): Promise<IngredientMatch | undefined> => {
    const { data, error } = await supabase.rpc("match_ingredient", { p_text: text });
    if (error) throw error;
    return (data as IngredientMatch[])?.[0];
  };

  const verdictFor = async (text: string) => {
    const match = await best(text);
    return match
      ? isFlagged(match.category as ScanIngredientCategory, match.water_soluble)
      : false; // no match is benign — an unknown word can't invent a Skip
  };

  // The expensive mistake in both directions. A fatty alcohol is in almost
  // every conditioner and is fine; a short-chain one is drying. They differ by
  // one word, so fuzzy matching is exactly where they could be confused.
  describe("fatty alcohols are not drying alcohols", () => {
    it.each([
      "CETEARYL ALCOHOL",
      "CETYL ALCOHOL",
      "STEARYL ALCOHOL",
      "BEHENYL ALCOHOL",
      "BENZYL ALCOHOL",
      "LAURYL ALCOHOL",
      "OLEYL ALCOHOL",
    ])("%s does not flag", async (name) => {
      expect(await verdictFor(name)).toBe(false);
    });

    it.each([
      "ALCOHOL DENAT",
      "ALCOHOL DENAT.",
      "SD ALCOHOL 40",
      "ISOPROPYL ALCOHOL",
      "DENATURED ALCOHOL",
    ])("%s flags", async (name) => {
      expect(await verdictFor(name)).toBe(true);
    });
  });

  // Migration 0006: OCR moves spaces around inside a name.
  describe("spacing that OCR moved", () => {
    it.each([
      ["DIMETH ICONE", "dimethicone"],
      ["SODIUM LAURETH SUL FATE", "sodium laureth sulfate"],
      ["SODIUMLAURETHSULFATE", "sodium laureth sulfate"],
    ])("%s resolves to %s", async (read, expected) => {
      const match = await best(read);
      expect(match?.inci_name).toBe(expected);
      expect(match?.score).toBeGreaterThanOrEqual(0.97);
    });

    it("still prefers an exact name over a spacing variant", async () => {
      const match = await best("Dimethicone");
      expect(match?.via).toBe("exact");
      expect(match?.score).toBe(1);
    });
  });

  // Migration 0008: glyphs the camera confuses, whichever word they land in.
  describe("OCR glyph confusion", () => {
    it.each([
      ["DIMETHIC0NE", "dimethicone"],
      ["DIMETHlCONE", "dimethicone"],
      ["MlNERAL OIL", "mineral oil"],
      ["ALCOHOI DENAT", "alcohol denat"],
      ["S0DIUM LAURETH SULFATE", "sodium laureth sulfate"],
    ])("%s resolves to %s", async (read, expected) => {
      const match = await best(read);
      expect(match?.inci_name).toBe(expected);
    });

    it.each(["DIMETHIC0NE", "MlNERAL OIL", "ALCOHOI DENAT"])(
      "%s still reaches a Skip",
      async (read) => {
        // The point of the whole pass: each of these was a false Clear before.
        expect(await verdictFor(read)).toBe(true);
      },
    );

    it("does not let collapsed glyphs flag a fatty alcohol", async () => {
      // i/l collapsing makes "alcohol" and "alcohoi" the same string, so this
      // is where a false Skip would appear if the rule were too loose.
      expect(await verdictFor("CETEARYL ALCOHOI")).toBe(false);
      expect(await verdictFor("CETYL ALCOHOI")).toBe(false);
    });
  });

  // British spellings on European packaging.
  it("matches sulphate as sulfate", async () => {
    expect((await best("SODIUM LAURETH SULPHATE"))?.inci_name).toBe(
      "sodium laureth sulfate",
    );
  });
});
