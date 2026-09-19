"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { IngredientRow } from "@/components/IngredientRow";
import { copy } from "@/lib/copy";
import { isFlagged } from "@/lib/verdict";
import type { ScanIngredient } from "@/lib/db.types";

/** Enough to recognise the label without burying what follows it. */
const PREVIEW_ROWS = 4;

interface IngredientListProps {
  items: ScanIngredient[];
}

const groupLabel = (category: string) =>
  category in copy.groups
    ? copy.groups[category as keyof typeof copy.groups]
    : undefined;

/**
 * "What we counted" — the whole list, collapsed by default.
 *
 * Collapsed it starts at the top of the label and then jumps to the first
 * flagged ingredient if that hasn't appeared yet, so the reason for a Skip is
 * always on screen: a preview that stops at row four would show her the verdict
 * and hide what caused it.
 *
 * Rule 5: these are the names we *resolved*. Where we matched nothing there is
 * no resolved name, so the word the camera read stands in.
 */
export const IngredientList = ({ items }: IngredientListProps) => {
  const [open, setOpen] = useState(false);

  const flaggedAt = items.findIndex((item) =>
    isFlagged(item.category, item.water_soluble),
  );
  const head = items.slice(0, PREVIEW_ROWS);
  const jumpedTo = flaggedAt >= PREVIEW_ROWS ? items[flaggedAt] : null;
  const skipped = jumpedTo ? flaggedAt - PREVIEW_ROWS : 0;

  const row = (item: ScanIngredient) => (
    <IngredientRow
      key={item.id}
      position={item.pos}
      name={item.resolved_name ?? item.raw_text}
      category={groupLabel(item.category)}
      flagged={isFlagged(item.category, item.water_soluble)}
    />
  );

  return (
    <section className="py-4">
      <h2 className="text-[14px] font-medium text-ink-soft">
        {copy.verdict.countedLabel}
      </h2>

      <ul className="mt-1">
        {(open ? items : head).map(row)}

        {!open && jumpedTo && (
          <>
            <li className="flex items-center gap-3 py-1.5 text-[13px] text-ink-faint">
              <span className="w-6 shrink-0 text-right">⋯</span>
              {copy.verdict.hiddenRows(skipped)}
            </li>
            {row(jumpedTo)}
          </>
        )}
      </ul>

      {items.length > PREVIEW_ROWS && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-line py-2.5 text-[14px] font-medium text-ink"
        >
          {open ? copy.verdict.showLess : copy.verdict.showAll(items.length)}
          <ChevronDown
            size={16}
            strokeWidth={2}
            aria-hidden
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {/* Rule 2: the one and only disclosure about misreads. It sits directly
          under the list in both states — collapsed is the common case, and a
          note she only sees after expanding is a note she never sees. */}
      <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
        {copy.verdict.misreadNote}
      </p>
    </section>
  );
};
