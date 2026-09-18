import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getScanView } from "@/lib/scans";
import { getProductCandidates, getProductTypes } from "@/lib/products";
import { NameBottle } from "@/components/NameBottle";
import { copy } from "@/lib/copy";

/**
 * Name the bottle — the second half of the optional tail.
 *
 * Reached only from a verdict she already has (rule 1). The work of proposing a
 * match happens here on the server; the form below it is a client component.
 */
export default async function NameScanPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = await params;
  if (!/^\d+$/.test(scanId)) notFound();

  const view = await getScanView(Number(scanId));
  if (!view?.scan.verdict) notFound();

  const [candidates, types] = await Promise.all([
    getProductCandidates(view.scan.id),
    getProductTypes(),
  ]);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-16">
      <Link
        href={`/s/${view.scan.id}`}
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft"
      >
        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
        {copy.list.back}
      </Link>

      <NameBottle
        scanId={view.scan.id}
        barcode={view.scan.barcode}
        candidates={candidates}
        types={types}
      />
    </div>
  );
}
