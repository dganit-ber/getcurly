/**
 * Seeds the products table from the Open Beauty Facts export.
 *
 * Data is ODbL-licensed and crowdsourced — treat every row as "what a label
 * said whenever someone last looked", never as current fact. Every row is
 * written with source='obf' and no verified_at, so `product_confidence` reports
 * it as `seed_only` and the UI shows no verdict for it (rule 7).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/importObf.ts ~/Downloads/en.openbeautyfacts.org.products.csv.gz
 *   npx tsx --env-file=.env.local scripts/importObf.ts <file> --dry-run
 *
 * `--dry-run` reads the whole export and reports what it would write, without
 * touching the database. Worth doing first: the export layout changes between
 * dumps, and a run that silently matched nothing looks the same as one that
 * found nothing.
 */
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";
import { looksLikeHair } from "@/lib/hairProduct";

const BATCH_SIZE = 500;

/**
 * Columns are found by name from the header row rather than by position.
 *
 * The previous version hardcoded indices (code 0, product_name 10, …) and
 * skipped any row with fewer than 43 fields. OBF adds columns between dumps, so
 * a fresh export would have quietly imported the wrong fields or nothing at all.
 */
const COLUMNS = {
  barcode: ["code"],
  name: ["product_name", "product_name_en", "generic_name", "generic_name_en"],
  brand: ["brands"],
  categories: ["categories_tags", "categories_en", "categories"],
  ingredients: ["ingredients_text", "ingredients_text_en"],
  quantity: ["quantity"],
  countries: ["countries_tags", "countries_en", "countries"],
} as const;

type Field = keyof typeof COLUMNS;

const locate = (header: string[]): Record<Field, number[]> => {
  const index = new Map(header.map((h, i) => [h.trim().toLowerCase(), i]));
  const found = {} as Record<Field, number[]>;

  for (const [field, names] of Object.entries(COLUMNS) as [Field, readonly string[]][]) {
    found[field] = names
      .map((n) => index.get(n))
      .filter((i): i is number => i !== undefined);
  }
  return found;
};

/** First non-empty value among the candidate columns for a field. */
const pick = (fields: string[], at: number[]): string => {
  for (const i of at) {
    const value = fields[i]?.trim();
    if (value) return value;
  }
  return "";
};

/**
 * Map onto the closed `product_types` list (rule 9).
 *
 * The old version returned "mask", "styling" and "hair care", none of which are
 * product_types slugs — since 0004 added the foreign key those would be rejected
 * outright. Order matters: the more specific tests come first, because a
 * "curl defining gel" is a gel and a "deep conditioning mask" is not a plain
 * conditioner.
 */
const TYPE_RULES: [RegExp, string][] = [
  [/co-?wash|cleansing conditioner/i, "co_wash"],
  [/clarif|purif|detox|anti-?residue/i, "clarifying"],
  [/low-?poo|sulfate-?free shampoo|gentle shampoo/i, "low_poo"],
  [/dry shampoo|shampoo|shampooing|champ[úu]|shampoing/i, "shampoo"],
  [/mask|masque|maske|deep condition|treatment mask/i, "deep_conditioner"],
  [/leave-?in/i, "leave_in"],
  [/conditioner|apr[èe]s-?shampoo?ing|balsam|sp[üu]lung|acondicionador/i, "conditioner"],
  [/curl cream|styling cream|cr[èe]me/i, "curl_cream"],
  [/mousse|foam/i, "mousse"],
  [/gel/i, "gel"],
  [/spray|hairspray|laque/i, "styling_spray"],
  [/serum|oil|huile|[öo]l/i, "oil"],
  [/protein|keratin|bond/i, "protein_treatment"],
  [/scalp|cuir chevelu|kopfhaut/i, "scalp_treatment"],
];

const typeFor = (categories: string, name: string): string => {
  const haystack = `${name} ${categories}`;
  for (const [pattern, slug] of TYPE_RULES) {
    if (pattern.test(haystack)) return slug;
  }
  return "other";
};

interface ProductRow {
  barcode: string;
  name: string;
  brand: string;
  type: string;
  /**
   * Both optional, and OMITTED rather than set to null when the export hasn't
   * got them — see `bucketFor`. A product with no list is still worth storing:
   * `product_confidence` reports it as tier `no_list` and the UI offers to read
   * the label rather than pretending to an answer.
   */
  ingredients_text?: string;
  size?: string;
  source: string;
}

/**
 * Rows are batched by which optional columns they carry.
 *
 * An upsert only updates the columns present in its payload, so omitting
 * `ingredients_text` leaves an existing list untouched — whereas sending null
 * would wipe it. A third of this export has no list, and a re-import that
 * silently deleted lists we already held would be the worst kind of bug: no
 * error, and nothing to notice until someone scanned the product.
 *
 * PostgREST takes its column list from the first object in a request, so rows
 * of different shapes cannot share one batch.
 */
const bucketFor = (row: ProductRow): string =>
  Object.keys(row).sort().join(",");

const main = async () => {
  const [path, ...flags] = process.argv.slice(2);
  if (!path) throw new Error("Pass the path to the .csv.gz export.");
  const dryRun = flags.includes("--dry-run");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dryRun && (!url || !key)) throw new Error("Missing Supabase env vars.");

  const supabase = dryRun ? null : createClient(url!, key!);

  const lines = createInterface({
    input: createReadStream(path).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  let at: Record<Field, number[]> | null = null;
  let rows = 0;
  let hair = 0;
  let written = 0;
  let withList = 0;
  const skipped = { noBarcode: 0, noName: 0, noBrand: 0, duplicate: 0 };
  const byType = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const batches = new Map<string, ProductRow[]>();
  const barcodes = new Set<string>();

  const flush = async (key?: string) => {
    for (const [bucket, rows] of [...batches]) {
      if (key !== undefined && bucket !== key) continue;
      if (rows.length === 0) continue;

      if (supabase) {
        const { error } = await supabase
          .from("products")
          .upsert(rows, { onConflict: "barcode" });
        if (error) throw error;
      }
      written += rows.length;
      batches.set(bucket, []);
      if (supabase) process.stdout.write(`\rwritten ${written}`);
    }
  };

  for await (const line of lines) {
    if (!at) {
      at = locate(line.split("\t"));
      const missing = (Object.keys(COLUMNS) as Field[]).filter((f) => at![f].length === 0);
      // Barcode and name are the two we cannot work without. Failing here beats
      // importing a few thousand rows of empty strings.
      if (missing.includes("barcode") || missing.includes("name")) {
        throw new Error(`Export is missing required columns: ${missing.join(", ")}`);
      }
      if (missing.length > 0) console.warn(`note: no column for ${missing.join(", ")}`);
      continue;
    }

    rows += 1;
    const f = line.split("\t");

    const categories = pick(f, at.categories);
    const name = pick(f, at.name);
    // Anything hair-shaped is stored. Whether a given bottle deserves a
    // verdict is decided when she's looking at it, not here.
    if (!looksLikeHair(categories, name)) continue;
    hair += 1;

    const barcode = pick(f, at.barcode);
    const brand = pick(f, at.brand).split(",")[0]?.trim() ?? "";
    const text = pick(f, at.ingredients);

    if (!barcode) { skipped.noBarcode += 1; continue; }
    if (!name) { skipped.noName += 1; continue; }
    // brand and name are NOT NULL, and a listing needs both to mean anything
    // to her (rule 9). An unnamed bottle isn't worth a row.
    if (!brand) { skipped.noBrand += 1; continue; }
    if (barcodes.has(barcode)) { skipped.duplicate += 1; continue; }
    barcodes.add(barcode);

    const type = typeFor(categories, name);
    byType.set(type, (byType.get(type) ?? 0) + 1);
    if (text) withList += 1;

    // The export is worldwide; this is how you see how much of it is European
    // without taking anyone's word for it.
    for (const c of pick(f, at.countries).split(",")) {
      const country = c.trim().replace(/^en:/, "");
      if (country) byCountry.set(country, (byCountry.get(country) ?? 0) + 1);
    }

    const size = pick(f, at.quantity);
    const row: ProductRow = {
      barcode,
      name,
      brand,
      type,
      source: "obf",
      ...(text ? { ingredients_text: text } : {}),
      ...(size ? { size } : {}),
    };

    const bucket = bucketFor(row);
    const pending = batches.get(bucket) ?? [];
    pending.push(row);
    batches.set(bucket, pending);

    if (pending.length >= BATCH_SIZE) await flush(bucket);
  }

  await flush();

  console.log(`\n\n${dryRun ? "DRY RUN — nothing written" : "done"}`);
  console.log(`  rows read          ${rows}`);
  console.log(`  hair products      ${hair}`);
  console.log(`  ${dryRun ? "would write" : "written"}        ${written}`);
  console.log(`    with a list      ${withList}`);
  console.log(`    identity only    ${written - withList}  (tier no_list — no verdict, rule 7)`);
  console.log(`  skipped            ${JSON.stringify(skipped)}`);
  console.log(`  types              ${JSON.stringify(Object.fromEntries([...byType].sort((a, b) => b[1] - a[1])))}`);
  const top = [...byCountry].sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log(`  top countries      ${JSON.stringify(Object.fromEntries(top))}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
