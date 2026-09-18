import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { reviseScan } from "./scanEdits";
import { buildScanItems } from "./labelScan";
import type { ScanIngredient } from "./db.types";

/**
 * Revising a list is append-only surgery on real rows (rule 11), so the only
 * honest test of it asks the real database. Skipped without credentials, the
 * same trade as matchIngredient.db.test.ts.
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

/**
 * Fresh per run: `record_label_scan` rate-limits by ip_hash, so a fixed value
 * makes the suite pass once and fail every time after until the window rolls.
 */
const IP_HASH = `test-revise-${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe.skipIf(!configured)("reviseScan against the real database", () => {
  let supabase: SupabaseClient;
  const created: number[] = [];

  beforeAll(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  });

  afterAll(async () => {
    // scan_ingredients cascades on delete, so the scans are enough.
    if (created.length > 0) await supabase.from("scans").delete().in("id", created);
  });

  /**
   * A scan built through the real entry point — tokenized and matched exactly
   * as a photographed label is, so the rows carry real categories.
   */
  const givenScan = async (names: string[]) => {
    const items = await buildScanItems(supabase, names.join(", "));
    const { data, error } = await supabase.rpc("record_label_scan", {
      p_items: items,
      p_ip_hash: IP_HASH,
    });
    if (error) throw error;
    const row = (data as { scan_id: number; verdict: string }[])[0];
    created.push(row.scan_id);
    return row;
  };

  const rowsOf = async (scanId: number) => {
    const { data, error } = await supabase
      .from("scan_ingredients")
      .select("*")
      .eq("scan_id", scanId)
      .order("pos", { ascending: true });
    if (error) throw error;
    return data as ScanIngredient[];
  };

  const revise = async (
    scanId: number,
    changes: Partial<{ edits: { pos: number; text: string }[]; removed: number[]; added: string[] }>,
  ) => {
    const result = await reviseScan(supabase, {
      scanId,
      ipHash: IP_HASH,
      edits: changes.edits ?? [],
      removed: changes.removed ?? [],
      added: changes.added ?? [],
    });
    if (result) created.push(result.scanId);
    return result;
  };

  it("leaves the original scan untouched (rule 11)", async () => {
    const original = await givenScan(["Aqua", "Sodium Laureth Sulfate", "Glycerin"]);

    await revise(original.scan_id, { removed: [2] });

    const before = await rowsOf(original.scan_id);
    expect(before).toHaveLength(3);
    expect(before.map((r) => r.pos)).toEqual([1, 2, 3]);

    const { data } = await supabase
      .from("scans")
      .select("verdict")
      .eq("id", original.scan_id)
      .single();
    expect((data as { verdict: string }).verdict).toBe("skip");
  });

  it("removing the only sulfate turns a Skip into a Clear", async () => {
    const original = await givenScan(["Aqua", "Sodium Laureth Sulfate", "Glycerin"]);
    expect(original.verdict).toBe("skip");

    const revised = await revise(original.scan_id, { removed: [2] });

    expect(revised).not.toBeNull();
    expect(revised!.verdict).toBe("clear");
    expect(revised!.scanId).not.toBe(original.scan_id);
  });

  it("closes the gap a removal leaves, keeping label order", async () => {
    const original = await givenScan(["Aqua", "Parfum", "Glycerin", "Citric Acid"]);

    const revised = await revise(original.scan_id, { removed: [2] });
    const rows = await rowsOf(revised!.scanId);

    expect(rows.map((r) => r.pos)).toEqual([1, 2, 3]);
    // Aqua, Glycerin and Citric Acid aren't in the dictionary yet, so they show
    // as what the label said. What matters here is that Parfum is gone and the
    // other three kept their order.
    expect(rows.map((r) => r.resolved_name ?? r.raw_text)).toEqual([
      "Aqua",
      "Glycerin",
      "Citric Acid",
    ]);
  });

  it("re-matches a retyped word and flips the verdict on it", async () => {
    const original = await givenScan(["Aqua", "Glycerin", "Citric Acid"]);
    expect(original.verdict).toBe("clear");

    const revised = await revise(original.scan_id, {
      edits: [{ pos: 2, text: "Dimethicone" }],
    });

    expect(revised!.verdict).toBe("skip");
    const rows = await rowsOf(revised!.scanId);
    expect(rows[1].resolved_name).toBe("dimethicone");
    expect(rows[1].category).toBe("silicone");
    expect(rows[1].resolution).toBe("user_typed");
  });

  it("appends an ingredient the photo missed, and counts it", async () => {
    const original = await givenScan(["Aqua", "Glycerin"]);

    const revised = await revise(original.scan_id, { added: ["Sodium Lauryl Sulfate"] });

    expect(revised!.verdict).toBe("skip");
    const rows = await rowsOf(revised!.scanId);
    expect(rows).toHaveLength(3);
    expect(rows[2].pos).toBe(3);
    expect(rows[2].category).toBe("sulfate");
    expect(rows[2].resolution).toBe("user_added");
  });

  it("keeps ingredient_count describing the new list", async () => {
    const original = await givenScan(["Aqua", "Parfum", "Glycerin"]);

    const revised = await revise(original.scan_id, { removed: [2] });

    const { data } = await supabase
      .from("scans")
      .select("ingredient_count")
      .eq("id", revised!.scanId)
      .single();
    expect((data as { ingredient_count: number }).ingredient_count).toBe(2);
  });

  it("keeps a word it doesn't know, without letting it invent a Skip", async () => {
    const original = await givenScan(["Aqua", "Glycerin"]);

    const revised = await revise(original.scan_id, { added: ["Zzqx Nonsense Extract"] });

    expect(revised!.verdict).toBe("clear");
    const rows = await rowsOf(revised!.scanId);
    expect(rows).toHaveLength(3);
    expect(rows[2].category).toBe("unknown");
  });
});
