import { copy } from "@/lib/copy";

/** The five groups that rule a product out. cg_safe and neutral never appear here. */
export type FlaggedCategory = keyof typeof copy.why;

interface FlaggedIngredientProps {
  position: number;
  name: string;
  category: FlaggedCategory;
}

/**
 * One flagged ingredient, three lines: what it is, where it sits and which
 * group it belongs to, and what it does to curls. Position matters enough to
 * print — a sulfate at #2 isn't a sulfate at #22.
 */
export const FlaggedIngredient = ({
  position,
  name,
  category,
}: FlaggedIngredientProps) => (
  <li className="border-b border-line py-3.5 last:border-0">
    <p className="text-[15px] font-medium capitalize text-ink">{name}</p>
    <p className="mt-0.5 text-[13px] text-muted">
      {copy.groups[category]} · #{position} on the label
    </p>
    <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
      {copy.why[category]}
    </p>
  </li>
);
