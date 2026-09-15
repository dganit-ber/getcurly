import Link from "next/link";
import { notFound } from "next/navigation";
import { getScanView } from "@/lib/scans";
import { VerdictBlock } from "@/components/VerdictBlock";
import { PickCard } from "@/components/PickCard";
import { ClearedGroups } from "@/components/ClearedGroups";
import { IngredientList } from "@/components/IngredientList";
import {
  FlaggedIngredient,
  type FlaggedCategory,
} from "@/components/FlaggedIngredient";
import { copy } from "@/lib/copy";
import type { Verdict } from "@/lib/db.types";

/**
 * The verdict from a label scan.
 *
 * The scan is the subject rather than the product, because at this point we
 * often don't know what the bottle is — and rule 1 says the answer can't wait
 * on identifying it.
 */
export default async function ScanVerdictPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = await params;
  if (!/^\d+$/.test(scanId)) notFound();

  const view = await getScanView(Number(scanId));
  // A scan with no verdict was never completed; there is nothing to show.
  if (!view?.scan.verdict) notFound();

  const { scan, counted, reasons, openQuestions, productName } = view;
  const verdict = scan.verdict as Verdict;
  const flaggedGroups = [
    ...new Set(reasons.map((reason) => reason.category as FlaggedCategory)),
  ];

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-14">
      <VerdictBlock verdict={verdict} flaggedCount={reasons.length} />

      {/* Rule 3 — the only interruption, and only when it would change the answer. */}
      {openQuestions[0] && (
        <PickCard scanId={scan.id} question={openQuestions[0]} />
      )}

      <section className="border-t border-line py-3">
        <p className="text-[16px] font-semibold text-ink">
          {productName ? copy.verdict.looksLike(productName) : copy.verdict.unknownProduct}
        </p>
        {!productName && (
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {copy.verdict.unknownProductMeta}
          </p>
        )}
      </section>

      {verdict === "skip" ? (
        <section className="border-t border-line py-3">
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-ink">
            {copy.verdict.whatWeFound}
          </h2>
          <ul className="mt-1">
            {reasons.map((reason) => (
              <FlaggedIngredient
                key={reason.pos}
                position={reason.pos}
                name={reason.resolved_name ?? ""}
                category={reason.category as FlaggedCategory}
              />
            ))}
          </ul>
          <ClearedGroups flagged={flaggedGroups} />
        </section>
      ) : (
        <section className="border-t border-line py-3">
          <ClearedGroups flagged={[]} />
        </section>
      )}

      <div className="border-t border-line">
        <IngredientList items={counted} />
      </div>

      <section className="mt-2 rounded-2xl bg-surface-2 p-4">
        <p className="text-[14px] font-semibold text-ink">
          {copy.evidence.firstRead}
        </p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
          {copy.evidence.firstReadBody}
        </p>
      </section>

      <Link
        href="/scan"
        className="mt-5 block w-full rounded-full border border-line py-3.5 text-center text-[16px] font-semibold text-ink"
      >
        {copy.verdict.scanAnother}
      </Link>
    </div>
  );
}
