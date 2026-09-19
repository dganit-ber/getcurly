import { copy } from "@/lib/copy";
import { agoLabel, onDate } from "@/lib/confidence";
import type { ProductConfidence } from "@/lib/db.types";

/**
 * "Ingredients last checked: 4 March 2026 · 6 months ago, by 3 people".
 *
 * Rule 6: shown every single time, for everyone, on every barcode answer — an
 * answer without its age is a claim we can't stand behind.
 *
 * The two dates stay separate on purpose. `list_read_at` is when the list came
 * off a photo; `checked_at` is when a person last confirmed it against a bottle.
 * "Read in March, confirmed today" is a stronger claim than either alone, and
 * collapsing them into one date throws that away.
 */
export const LastChecked = ({ confidence }: { confidence: ProductConfidence }) => (
  <section className="mt-3 border-t border-line py-3">
    <h2 className="text-[13px] text-ink-soft">{copy.barcode.lastCheckedLabel}</h2>

    {confidence.checked_at ? (
      <>
        <p className="mt-0.5 font-display text-[17px] font-semibold tracking-tight text-ink">
          {onDate(confidence.checked_at)}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {copy.barcode.lastCheckedSub(agoLabel(confidence.days_since), confidence.checks)}
        </p>
      </>
    ) : (
      <p className="mt-0.5 text-[14px] leading-relaxed text-ink">
        {copy.barcode.neverChecked}
      </p>
    )}
  </section>
);
