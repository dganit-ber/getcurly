import { LabelCapture } from "@/components/LabelCapture";
import { BarcodeCapture } from "@/components/BarcodeCapture";
import { ScanModeTabs, type ScanMode } from "@/components/ScanModeTabs";
import { isProductBarcode } from "@/lib/barcode";

/**
 * The camera, in two modes.
 *
 * Barcode is the default because it's the two-second answer — one tap fewer
 * than the label, and no upload. The label is one tap away for the bottles we
 * don't have, which is most of them.
 */
export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; for?: string; barcode?: string }>;
}) {
  // `?for=[id]` — re-reading the label of a product we already have. That
  // errand is only ever about the label, so it pins the mode and drops the
  // tabs rather than offering a barcode she has already scanned.
  const { mode, for: productId, barcode } = await searchParams;
  const active: ScanMode = productId || mode === "label" ? "label" : "barcode";

  // `?barcode=` — she scanned a code we don't have and came here to read the
  // label instead. It travels with the scan so the bottle she names at the end
  // is findable by that code next time. Checked again here: it arrives in a URL
  // she could have typed, and a bad one would be stored as gospel.
  const carried = barcode && isProductBarcode(barcode) ? barcode : null;

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10">
      {!productId && <ScanModeTabs mode={active} />}

      {active === "label" ? (
        <LabelCapture productId={productId ?? null} barcode={carried} />
      ) : (
        <BarcodeCapture />
      )}
    </div>
  );
}
