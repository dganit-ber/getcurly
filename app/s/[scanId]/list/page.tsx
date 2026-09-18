import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getScanView } from "@/lib/scans";
import { EditableIngredientList } from "@/components/EditableIngredientList";
import { copy } from "@/lib/copy";

/**
 * "What we counted" — the whole list the verdict was worked out from, and the
 * one place she can correct it.
 *
 * Optional, always: she already has her answer (rule 1), and the footer says so.
 * The fetch stays here on the server; the editing lives in the client component
 * below it.
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
      <p className="mt-1 text-[13px] text-ink-faint">
        {copy.list.count(counted.length)}
      </p>
      <p className="mt-2.5 text-[14px] leading-relaxed text-ink-soft">
        {copy.list.body}
      </p>

      <EditableIngredientList scanId={scan.id} counted={counted} />

      <Link
        href="/scan?mode=label"
        className="mt-3 block w-full py-2 text-center text-[14px] text-ink-soft"
      >
        {copy.list.retake}
      </Link>

      <p className="mt-4 text-[14px] text-ink-soft">{copy.list.notRequired}</p>
    </div>
  );
}
