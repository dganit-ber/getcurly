"use client";

import { useMemo, useState } from "react";
import { HAIR_BRANDS } from "@/lib/brands";
import { findSimilarBrands, normalizeBrand } from "@/lib/brandMatch";
import { copy } from "@/lib/copy";

interface BrandAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

/** Enough to choose from without becoming a list she has to read. */
const SUGGESTIONS = 6;

/**
 * The 373 brands, fuzzy, showing the near misses.
 *
 * Showing them is the point: hiding matches behind an exact prefix wastes the
 * fuzzy matching, and "did you mean Garnier?" after she typed "Garnie" is the
 * difference between one listing and two spellings of one listing. The field
 * still accepts anything — the list isn't exhaustive, and a brand we don't know
 * is not a reason to stop her.
 */
export const BrandAutocomplete = ({ value, onChange }: BrandAutocompleteProps) => {
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const typed = value.trim();
  const isKnown = HAIR_BRANDS.some((brand) => brand === typed);

  const suggestions = useMemo(() => {
    const key = normalizeBrand(value);
    if (!key) return [];
    return HAIR_BRANDS.filter((brand) => normalizeBrand(brand).includes(key)).slice(
      0,
      SUGGESTIONS,
    );
  }, [value]);

  // Only once she's done typing — correcting a half-typed word is noise.
  const similar = useMemo(
    () => (focused || isKnown || dismissed === typed ? [] : findSimilarBrands(value)),
    [value, typed, focused, isKnown, dismissed],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="brand" className="text-[13px] font-medium text-ink-soft">
        {copy.newProduct.brandLabel}
      </label>

      <div className="relative">
        <input
          id="brand"
          name="brand"
          value={value}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          // Long enough for a tap on a suggestion to register before the list
          // closes under her finger.
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-ink"
        />

        {focused && suggestions.length > 0 && !isKnown && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
            {suggestions.map((brand) => (
              <li key={brand}>
                <button
                  type="button"
                  onMouseDown={() => onChange(brand)}
                  className="w-full px-3.5 py-2.5 text-left text-[15px] text-ink"
                >
                  {brand}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {similar.length > 0 && (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] text-ink-soft">
          {copy.newProduct.didYouMean}
          {similar.map((match) => (
            <button
              key={match.name}
              type="button"
              onClick={() => onChange(match.name)}
              className="font-medium text-accent"
            >
              {match.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDismissed(typed)}
            className="text-ink-faint"
          >
            {copy.newProduct.keepWhatITyped}
          </button>
        </p>
      )}
    </div>
  );
};
