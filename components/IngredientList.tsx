import Link from "next/link";
import { IngredientRow } from "@/components/IngredientRow";
import { copy } from "@/lib/copy";
import type { ScanIngredient } from "@/lib/db.types";

/** Enough to recognise the label, short enough not to compete with the verdict. */
const PREVIEW_ROWS = 6;

interface IngredientListProps {
  items: ScanIngredient[];
  /** Where "see the whole list" points. Omitted renders the preview with no link. */
  href?: string;
}

/**
 * "What we counted" — read-only preview for the verdict screens.
 *
 * Rule 5: these are the names we *resolved*, not the raw OCR string. Where we
 * matched nothing there is no resolved name, so the word the camera read stands
 * in — she needs to see that we counted it before she can correct it.
 */
export const IngredientList = ({ items, href }: IngredientListProps) => {
  const shown = items.slice(0, PREVIEW_ROWS);
  const remaining = items.length - shown.length;

  return (
    <section className="py-6">
      <h2 className="text-[13px] font-medium text-muted">
        {copy.verdict.countedLabel}
      </h2>

      <ul className="mt-2">
        {shown.map((item) => (
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

      {remaining > 0 && (
        <p className="mt-1 text-[13px] text-muted">
          {copy.verdict.countedMore(remaining)}
        </p>
      )}

      {href && (
        <Link
          href={href}
          className="mt-3 inline-block text-[13px] font-medium text-ink underline underline-offset-4"
        >
          {copy.verdict.seeWholeList}
        </Link>
      )}

      {/* Rule 2: the one and only disclosure about misreads. */}
      <p className="mt-4 text-[13px] leading-relaxed text-muted">
        {copy.verdict.misreadNote}
      </p>
    </section>
  );
};
