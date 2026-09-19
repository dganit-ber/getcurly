import { UnderConstruction } from "@/components/UnderConstruction";
import { copy } from "@/lib/copy";

/**
 * Parked.
 *
 * The old form asked her to declare whether a product fits the method, and
 * stored that claim as fact. The rewrite works the verdict out from the
 * ingredients instead, so that question no longer has an answer worth keeping —
 * and rule 10 means nothing she submits is published on submit anyway.
 *
 * Adding a bottle now happens off the back of a scan, at `/s/[scanId]/name`.
 * Step 08 builds the standalone add flow (`/new`) on the same foundations.
 */
export default function ProductsPage() {
  return <UnderConstruction title={copy.products.parkedTitle} />;
}
