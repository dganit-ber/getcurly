"use client";

import { copy } from "@/lib/copy";
import type { ProductType } from "@/lib/db.types";

interface TypeSelectProps {
  value: string;
  types: ProductType[];
  onChange: (value: string) => void;
}

/**
 * The closed list, as a plain select (rule 9).
 *
 * Never free text, and never prefilled from a guess — what a product *is* is
 * the one field a wrong value does lasting damage to, because it decides which
 * bottle gets recommended to the next person.
 */
export const TypeSelect = ({ value, types, onChange }: TypeSelectProps) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor="product-type" className="text-[13px] font-medium text-ink-soft">
      {copy.newProduct.typeLabel}
    </label>

    <select
      id="product-type"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-ink"
    >
      <option value="">{copy.newProduct.typePlaceholder}</option>
      {types.map((type) => (
        <option key={type.slug} value={type.slug}>
          {type.label}
        </option>
      ))}
    </select>
  </div>
);
