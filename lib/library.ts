import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface LibraryCounts {
  withBarcode: number;
  confirmed: number;
}

/**
 * The two numbers on the home page. Null when we can't reach the database —
 * the gap between them is the honest part of the page, so a placeholder number
 * would undo what the rest of it trades on. The caller drops the section.
 */
export const getLibraryCounts = async (): Promise<LibraryCounts | null> => {
  try {
    const supabase = createServerSupabaseClient();

    const [withBarcode, confirmed] = await Promise.all([
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .not("barcode", "is", null),
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .not("verified_at", "is", null),
    ]);

    if (withBarcode.error || confirmed.error) return null;

    return {
      withBarcode: withBarcode.count ?? 0,
      confirmed: confirmed.count ?? 0,
    };
  } catch {
    return null;
  }
};
