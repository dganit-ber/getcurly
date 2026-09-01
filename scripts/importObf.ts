/**
 * Seeds the products table from the Open Beauty Facts export.
 *
 * Data is ODbL-licensed and crowdsourced — treat every row as "what a label
 * said whenever someone last looked", never as current fact. Each row is
 * written with source='obf' and no verified_at, so the UI shows it as unverified
 * until a logged-in user rescans the physical label.
 *
 * Usage:
 *   npm i -D tsx
 *   npx tsx --env-file=.env.local scripts/importObf.ts ~/Downloads/en.openbeautyfacts.org.products.csv.gz
 */
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";
import { matchIngredients } from "@/lib/matchIngredients";
import { ingredients } from "@/lib/ingredients";

const CODE = 0;
const PRODUCT_NAME = 10;
const BRANDS = 18;
const CATEGORIES_TAGS = 22;
const INGREDIENTS_TEXT = 42;

const BATCH_SIZE = 500;

/** Map OBF category tags onto the app's coarse product types. */
const typeFor = (tags: string): string => {
  if (tags.includes("shampoo")) return "shampoo";
  if (tags.includes("conditioner")) return "conditioner";
  if (tags.includes("mask")) return "mask";
  if (
    tags.includes("gel") ||
    tags.includes("mousse") ||
    tags.includes("styling")
  )
    return "styling";
  if (tags.includes("oil")) return "oil";
  return "hair care";
};

interface ProductRow {
  barcode: string;
  name: string;
  brand: string;
  type: string;
  ingredients_text: string;
  cg_approved: string;
  source: string;
}

const main = async () => {
  const path = process.argv[2];
  if (!path) throw new Error("Pass the path to the .csv.gz export.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars.");

  const supabase = createClient(url, key);

  const lines = createInterface({
    input: createReadStream(path).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  let header = true;
  let seen = 0;
  let written = 0;
  let batch: ProductRow[] = [];
  const barcodes = new Set<string>();

  const flush = async () => {
    if (batch.length === 0) return;
    const { error } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "barcode" });
    if (error) throw error;
    written += batch.length;
    batch = [];
    process.stdout.write(`\rwritten ${written}`);
  };

  for await (const line of lines) {
    if (header) {
      header = false;
      continue;
    }

    const f = line.split("\t");
    if (f.length < 43) continue; // malformed row, skip

    const tags = f[CATEGORIES_TAGS] ?? "";
    if (!tags.includes("hair")) continue;

    const barcode = f[CODE]?.trim();
    const name = f[PRODUCT_NAME]?.trim();
    const brand = f[BRANDS]?.split(",")[0]?.trim();
    const text = f[INGREDIENTS_TEXT]?.trim();

    if (!barcode || !name || !brand || !text) continue;
    if (barcodes.has(barcode)) continue; // export can repeat a code
    barcodes.add(barcode);

    seen += 1;

    // Precompute the verdict so search can answer without a scan.
    const flagged = matchIngredients([{ description: text }], ingredients);

    batch.push({
      barcode,
      name,
      brand,
      type: typeFor(tags),
      ingredients_text: text,
      cg_approved: flagged.length === 0 ? "true" : "false",
      source: "obf",
    });

    if (batch.length >= BATCH_SIZE) await flush();
  }

  await flush();
  console.log(`\ndone — ${seen} eligible, ${written} written`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
