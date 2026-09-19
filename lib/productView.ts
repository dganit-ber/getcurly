import "server-only";
import { createReadClient } from "@/lib/supabase/read";
import type { Product } from "@/lib/db.types";

/** The stored list, split back into rows for display. */
export interface StoredIngredient {
  pos: number;
  name: string;
}

export const getProduct = async (id: number): Promise<Product | null> => {
  const supabase = createReadClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return error || !data ? null : (data as Product);
};

/** Look a barcode up. Reads are open, so this needs no route handler. */
export const findByBarcode = async (barcode: string): Promise<Product | null> => {
  const supabase = createReadClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("barcode", barcode)
    .limit(1)
    .maybeSingle();

  return error || !data ? null : (data as Product);
};

/**
 * The stored list as numbered rows, in label order.
 *
 * Position is roughly concentration and is never re-sorted (rule 5) — the order
 * the text is stored in is the order it was printed in.
 */
export const storedIngredients = (product: Product): StoredIngredient[] =>
  (product.ingredients_text ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, i) => ({ pos: i + 1, name }));
