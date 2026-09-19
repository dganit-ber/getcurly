import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createReadClient } from "@/lib/supabase/read";
import type { ProductCandidate, ProductType } from "@/lib/db.types";

/**
 * The closed list behind every type dropdown (rule 9).
 *
 * Free text here is what would break "a cleanser that does the same job without
 * a sulfate" later, so the options are read from the table rather than written
 * into a component.
 */
export const getProductTypes = async (): Promise<ProductType[]> => {
  const supabase = createReadClient();
  const { data, error } = await supabase
    .from("product_types")
    .select("*")
    .order("sort_order", { ascending: true });

  return error ? [] : ((data ?? []) as ProductType[]);
};

export interface RankedProductType extends ProductType {
  /** How many listings carry this type. Used for order, not shown. */
  count: number;
}

/**
 * The closed list, busiest first.
 *
 * The order in `product_types` is editorial — cleanse, condition, style, treat —
 * which is the right order to *add* a product in and the wrong one to filter by:
 * it puts a type with two bottles above one with two hundred. Counting keeps
 * the chips she is most likely to want in the first row, where the collapsed
 * filter shows them.
 *
 * One count query per type, in parallel. It is a dozen indexed counts against a
 * closed list that changes by migration, not a scan of the table.
 */
export const getRankedProductTypes = async (): Promise<RankedProductType[]> => {
  const types = await getProductTypes();
  if (types.length === 0) return [];

  const supabase = createReadClient();
  const counted = await Promise.all(
    types.map(async (type) => {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("type", type.slug);
      return { ...type, count: count ?? 0 };
    }),
  );

  // Ties fall back to the editorial order, so an empty library still reads as
  // the list someone sat down and arranged rather than as alphabetical noise.
  return counted.sort((a, b) => b.count - a.count || a.sort_order - b.sort_order);
};

/**
 * Bottles whose stored ingredient list looks like this scan's.
 *
 * Empty is a perfectly normal answer — most scans are of something we haven't
 * met — and the screen treats it as "we don't know this one yet", never as a
 * failure.
 */
export const getProductCandidates = async (
  scanId: number,
  limit = 3,
): Promise<ProductCandidate[]> => {
  const supabase = createReadClient();
  const { data, error } = await supabase.rpc("products_like_scan", {
    p_scan_id: scanId,
    p_limit: limit,
  });

  return error ? [] : ((data ?? []) as ProductCandidate[]);
};

export interface NewProduct {
  brand: string;
  name: string;
  /** a product_types.slug — validated against the table, never trusted */
  type: string;
  size: string | null;
  barcode: string | null;
  /** the scan that prompted this, so its list becomes the product's first one */
  scanId: number | null;
}

/**
 * Why a listing couldn't be created. Worth distinguishing: a bad type is the
 * client sending something the dropdown can't produce, and anything else is
 * ours to fix — reporting both as "bad type" would hide our own failures behind
 * her input.
 */
export type CreateProductResult =
  | { ok: true; productId: number }
  | { ok: false; reason: "bad_type" | "server_error" };

/**
 * Create a listing.
 *
 * Rule 10: nothing is published on submit. The row is written with no
 * `verified_at`, which is what keeps it evidence rather than fact until a
 * second scan agrees with it.
 */
export const createProduct = async (
  supabase: SupabaseClient,
  product: NewProduct,
): Promise<CreateProductResult> => {
  // The type is the one field a wrong value does lasting damage to — a shampoo
  // filed as a conditioner sends the wrong bottle to the next person — so it is
  // checked against the table rather than taken on trust.
  const { data: type, error: typeError } = await supabase
    .from("product_types")
    .select("slug")
    .eq("slug", product.type)
    .maybeSingle();
  if (typeError) return { ok: false, reason: "server_error" };
  if (!type) return { ok: false, reason: "bad_type" };

  const { data, error } = await supabase
    .from("products")
    .insert({
      brand: product.brand,
      name: product.name,
      type: product.type,
      size: product.size,
      barcode: product.barcode,
      source: "manual",
      verified_at: null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, reason: "server_error" };

  const productId = (data as { id: number }).id;

  // Attach the scan that prompted this, so the listing carries the list she
  // actually read rather than waiting for someone to scan it again.
  if (product.scanId !== null) {
    await supabase.from("scans").update({ product_id: productId }).eq("id", product.scanId);

    const { error: listError } = await supabase.rpc("supersede_product_ingredients", {
      p_product_id: productId,
      p_scan_id: product.scanId,
    });

    // A listing with no ingredient list can't be found by the next person's
    // scan, which is the whole reason for naming it. Rather than leave that
    // behind for her to trip over, undo the insert so a retry starts clean —
    // the scan's product_id falls back to null with it.
    if (listError) {
      await supabase.from("products").delete().eq("id", productId);
      return { ok: false, reason: "server_error" };
    }
  }

  return { ok: true, productId };
};
