import { LabelCapture } from "@/components/LabelCapture";

/**
 * The camera. Label mode only for now — barcode mode and the mode switch arrive
 * with client-side barcode detection, which is a separate step.
 */
export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  // `?for=[id]` — re-reading the label of a product we already have.
  const { for: productId } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10">
      <LabelCapture productId={productId ?? null} />
    </div>
  );
}
