import "server-only";
import { createReadClient } from "@/lib/supabase/read";
import type { ProductConfidence } from "@/lib/db.types";

/**
 * How much we actually know about a product's ingredient list.
 *
 * Rule 7 turns on this and nothing else: a barcode hit on an Open Beauty Facts
 * row nobody has photographed gets no verdict, however confident the stored
 * list looks. Every entry point to a product page has to ask this before it
 * renders a VerdictPill.
 */
export const getConfidence = async (
  productId: number,
): Promise<ProductConfidence | null> => {
  const supabase = createReadClient();
  const { data, error } = await supabase.rpc("product_confidence", {
    p_product_id: productId,
  });

  if (error) return null;
  return ((data as ProductConfidence[]) ?? [])[0] ?? null;
};

/**
 * May this product show a verdict at all?
 *
 * `no_list` — we have nothing to work from.
 * `seed_only` — crowdsourced data no person has confirmed against a bottle. A
 *   wrong Clear on a shampoo she then buys is the one failure that would really
 *   cost us, so this stays silent too.
 *
 * Absent confidence is treated as no: failing closed is the safe direction when
 * the alternative is inventing an answer.
 */
export const mayShowVerdict = (confidence: ProductConfidence | null): boolean =>
  confidence !== null &&
  confidence.tier !== "no_list" &&
  confidence.tier !== "seed_only";

/** "today" / "3 days ago" / "5 months ago" — what `lastCheckedSub` reads. */
export const agoLabel = (days: number | null): string => {
  if (days === null) return "never";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
};

/** The date itself, spelled out — rule 6 wants a date she can read, not a badge. */
export const onDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
