import type { ScanIngredientCategory } from "@/lib/db.types";

/**
 * Display-only mirror of the database's `ingredient_is_flagged`.
 *
 * The verdict itself is *always* computed in Postgres — `compute_verdict` is the
 * only thing that decides Clear or Skip. This exists solely to label the two
 * candidates on the pick card with what each one would mean, and it has to be
 * kept in step with the SQL if that rule ever changes.
 */
export const isFlagged = (
  category: ScanIngredientCategory,
  waterSoluble: boolean | null,
): boolean => {
  if (category === "silicone") return !waterSoluble;
  return (
    category === "sulfate" ||
    category === "drying_alcohol" ||
    category === "mineral_oil" ||
    category === "wax"
  );
};
