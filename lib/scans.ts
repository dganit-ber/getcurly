import { createReadClient } from "@/lib/supabase/read";
import type {
  OpenQuestion,
  Scan,
  ScanIngredient,
  VerdictReason,
} from "@/lib/db.types";

/** Everything `/s/[scanId]` needs, in one place so the page stays declarative. */
export interface ScanView {
  scan: Scan;
  /** What we counted, in label order. Never re-sorted (rule 5). */
  counted: ScanIngredient[];
  /** The flagged rows behind a Skip. Empty on a Clear. */
  reasons: VerdictReason[];
  /**
   * The single condition under which we interrupt her after the verdict
   * (rule 3). Empty is the normal case and means: show nothing.
   */
  openQuestions: OpenQuestion[];
  /**
   * Set only when the scan was taken against a product we already had. A plain
   * label scan doesn't know what bottle it is yet — naming it is an optional
   * second tap, never a step before the answer.
   */
  productName: string | null;
}

export const getScanView = async (scanId: number): Promise<ScanView | null> => {
  const supabase = createReadClient();

  const { data: scan, error } = await supabase
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .maybeSingle();

  if (error || !scan) return null;

  const [counted, reasons, openQuestions, product] = await Promise.all([
    supabase
      .from("scan_ingredients")
      .select("*")
      .eq("scan_id", scanId)
      .order("pos", { ascending: true }),
    supabase.rpc("verdict_reasons", { p_scan_id: scanId }),
    supabase.rpc("scan_open_questions", { p_scan_id: scanId }),
    scan.product_id
      ? supabase
          .from("products")
          .select("brand, name")
          .eq("id", scan.product_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const named = product.data as { brand: string | null; name: string | null } | null;

  return {
    scan: scan as Scan,
    counted: (counted.data ?? []) as ScanIngredient[],
    reasons: (reasons.data ?? []) as VerdictReason[],
    // An error here must not cost her the verdict — no questions is the
    // normal case anyway, and showing none is the safe direction.
    openQuestions: (openQuestions.data ?? []) as OpenQuestion[],
    productName: named
      ? [named.brand, named.name].filter(Boolean).join(" ") || null
      : null,
  };
};
