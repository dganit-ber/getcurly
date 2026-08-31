"use client";

import { useMemo, useState } from "react";
import { HAIR_BRANDS } from "@/lib/brands";
import { findSimilarBrands, normalizeBrand } from "@/lib/brandMatch";

interface BrandFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export const BrandField = ({ value, error, onChange }: BrandFieldProps) => {
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const key = normalizeBrand(value);
    if (!key) return [];
    return HAIR_BRANDS.filter((b) => normalizeBrand(b).includes(key)).slice(
      0,
      6,
    );
  }, [value]);

  const isKnown = HAIR_BRANDS.some((b) => b === value.trim());

  const similar = useMemo(() => {
    if (focused || isKnown || dismissed === value.trim()) return [];
    return findSimilarBrands(value);
  }, [value, focused, isKnown, dismissed]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="brandname" className="text-xs text-muted">
        Brand name
      </label>

      <div className="relative">
        <input
          id="brandname"
          name="brandname"
          value={value}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-brand"
        />

        {focused && suggestions.length > 0 && !isKnown && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-sidebar">
            {suggestions.map((brand) => (
              <li key={brand}>
                <button
                  type="button"
                  onMouseDown={() => onChange(brand)}
                  className="w-full px-3.5 py-2.5 text-left text-sm text-ink hover:bg-sunk"
                >
                  {brand}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted">
        Not on the list? Type it anyway — we&apos;ll add it.
      </p>

      {similar.length > 0 && (
        <div className="rounded-xl border border-line bg-sunk p-3">
          <p className="text-[13px] text-ink">
            {similar[0].exact
              ? "We already have this brand spelled slightly differently. Same one?"
              : "Did you mean one of these?"}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-2">
            {similar.map((match) => (
              <button
                key={match.name}
                type="button"
                onClick={() => onChange(match.name)}
                className="rounded-full border border-brand px-3 py-1.5 text-[13px] font-bold text-brand"
              >
                {match.name}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setDismissed(value.trim())}
              className="rounded-full border border-line px-3 py-1.5 text-[13px] text-muted"
            >
              No, keep “{value.trim()}”
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  );
};
