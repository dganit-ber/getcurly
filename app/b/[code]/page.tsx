import { redirect } from "next/navigation";
import { findByBarcode } from "@/lib/productView";
import { isProductBarcode } from "@/lib/barcode";

// A lookup, never a cached one. The whole point of the check she may have just
// made on the product page is that the next person sees it.
export const dynamic = "force-dynamic";

/**
 * Where a decoded barcode lands.
 *
 * The camera can't read the database, and shouldn't: reads are open, so this is
 * a plain server read with the anon key and a redirect — no route handler, no
 * client-side Supabase call, and one URL she can share or reload.
 */
export default async function BarcodeLookupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // A hand-typed or mangled code isn't a miss, but it isn't a lookup either.
  if (!isProductBarcode(code)) redirect("/scan?mode=barcode");

  const product = await findByBarcode(code);

  redirect(
    product ? `/p/${product.id}?from=barcode` : `/new?barcode=${encodeURIComponent(code)}`,
  );
}
