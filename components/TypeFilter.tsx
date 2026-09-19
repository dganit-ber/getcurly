"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import type { ProductType } from "@/lib/db.types";

interface TypeFilterProps {
  /** Busiest first — the order decides what survives the collapse. */
  types: ProductType[];
  /** The selected slug, or null for everything. */
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * Chips that fit in two rows on the narrowest phone we design for. Labels
 * average around ninety points plus the gap, so four to a row at 400px — below
 * this there is no third row and "show more" would be a control that does
 * nothing when tapped.
 */
const FITS_IN_TWO_ROWS = 8;

/**
 * Two rows of chips, the rest behind "show more".
 *
 * Rows rather than a sideways scroll: a scrolling strip hides its own contents
 * behind a gesture, and on a phone it competes with the page's vertical scroll
 * — a half-swipe does neither. Two rows are visible at rest and she chooses
 * whether to open the rest, which is the same bargain as every other optional
 * thing in the app.
 *
 * The clamp is a height rather than a chip count because the labels are
 * different widths: "Gel" and "Clarifying shampoo" don't pack the same, so any
 * fixed number of chips is two rows on one phone and three on another.
 */
export const TypeFilter = ({ types, value, onChange }: TypeFilterProps) => {
  const [expanded, setExpanded] = useState(false);

  if (types.length === 0) return null;

  // The "All" chip counts towards the rows too.
  const overflows = types.length + 1 > FITS_IN_TWO_ROWS;

  const chip = (label: string, slug: string | null) => {
    const active = value === slug;
    return (
      <li key={slug ?? "all"}>
        <button
          type="button"
          onClick={() => onChange(slug)}
          aria-pressed={active}
          // A fixed height is what makes the two-row clamp exact: 2 × 32px plus
          // the 8px gap is the 72px below.
          className={`flex h-8 items-center whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium ${
            active
              ? "border-accent bg-accent text-on-accent"
              : "border-line bg-surface text-ink-soft"
          }`}
        >
          {label}
        </button>
      </li>
    );
  };

  return (
    <div className="mt-4">
      <ul
        className={`flex flex-wrap gap-2 ${
          expanded || !overflows ? "" : "max-h-18 overflow-hidden"
        }`}
      >
        {chip(copy.search.allTypes, null)}
        {types.map((type) => chip(type.label, type.slug))}
      </ul>

      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="mt-2 text-[13px] font-medium text-accent"
        >
          {expanded ? copy.search.showFewerTypes : copy.search.showMoreTypes}
        </button>
      )}
    </div>
  );
};
