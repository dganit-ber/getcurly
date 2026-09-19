import { AlertTriangle } from "lucide-react";
import { copy } from "@/lib/copy";

/**
 * "Manufacturers change ingredients" — rule 6.
 *
 * Sits directly under the verdict on any barcode answer, above the reasoning
 * and never behind a tap. A barcode tells us which product this is; only the
 * label tells us what's in it today, and that gap is the one thing she has to
 * know before trusting a stored list.
 */
export const CautionNote = () => (
  <section className="mt-3 flex gap-3 rounded-2xl border border-line bg-caution-bg p-4">
    <AlertTriangle
      size={18}
      strokeWidth={2}
      aria-hidden
      className="mt-0.5 shrink-0 text-caution"
    />
    <div>
      <h2 className="text-[14px] font-semibold text-caution">
        {copy.barcode.cautionTitle}
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink">
        {copy.barcode.caution}
      </p>
    </div>
  </section>
);
