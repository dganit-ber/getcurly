import { Check } from "lucide-react";
import { copy } from "@/lib/copy";
import type { FlaggedCategory } from "@/components/FlaggedIngredient";

/** The five groups that rule a product out. CG-safe is not one of them. */
const AVOID_GROUPS: FlaggedCategory[] = [
  "sulfate",
  "silicone",
  "drying_alcohol",
  "mineral_oil",
  "wax",
];

interface ClearedGroupsProps {
  /** Groups this label was flagged for. Empty on a Clear. */
  flagged: FlaggedCategory[];
}

/**
 * Which groups the label came through clean.
 *
 * On a Clear that's all five, itemised — the point of the screen is that we
 * checked. On a Skip the cleared ones collapse to a single line, so they don't
 * compete with the reasons she's actually being shown.
 */
export const ClearedGroups = ({ flagged }: ClearedGroupsProps) => {
  const cleared = AVOID_GROUPS.filter((group) => !flagged.includes(group));
  if (cleared.length === 0) return null;

  const labels = cleared.map((group) => copy.groups[group]);

  if (flagged.length > 0) {
    return (
      <p className="py-3 text-[13px] text-muted">
        {copy.verdict.nothingFlaggedIn} {labels.join(", ")}.
      </p>
    );
  }

  return (
    <ul className="py-2">
      {labels.map((label) => (
        <li key={label} className="flex items-center gap-2 py-1.5">
          <Check size={15} strokeWidth={2} className="text-clear" aria-hidden />
          <span className="text-[14px] text-ink">{label}</span>
        </li>
      ))}
    </ul>
  );
};
