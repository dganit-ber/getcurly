import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getScanView } from "@/lib/scans";
import { IngredientRow } from "@/components/IngredientRow";
import { copy } from "@/lib/copy";

/**
 * "What we counted" — the whole list the verdict was worked out from.
 *
 * Read-only for now. Editing a row and re-running the verdict through
 * `fork_scan` is the next step; the rows are already the resolved names
 * (rule 5), so what's here is what counted.
 */
export default async function ScanListPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = await params;
  if (!/^\d+$/.test(scanId)) notFound();

  const view = await getScanView(Number(scanId));
  if (!view?.scan.verdict) notFound();

  const { scan, counted } = view;

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-16">
      <Link
        href={`/s/${scan.id}`}
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft"
      >
        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
        {copy.list.back}
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
        {copy.list.title}
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
        {copy.list.body}
      </p>

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium text-ink-soft">
          {copy.list.inLabelOrder}
        </h2>
        <span className="text-[14px] text-ink-soft">{counted.length}</span>
      </div>

      <ul className="mt-1 divide-y divide-line">
        {counted.map((item) => (
          <IngredientRow
            key={item.id}
            position={item.pos}
            name={item.resolved_name ?? item.raw_text}
            category={
              item.category in copy.groups
                ? copy.groups[item.category as keyof typeof copy.groups]
                : undefined
            }
          />
        ))}
      </ul>

      <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">
        {copy.list.orderNote}
      </p>

      <p className="mt-4 text-[14px] text-ink-soft">{copy.list.notRequired}</p>
    </div>
  );
}
