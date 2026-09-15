import { Pencil, Trash2 } from "lucide-react";

interface IngredientRowProps {
  position: number;
  name: string;
  category?: string;
  /** Draws the row as one of the reasons for a Skip. */
  flagged?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
}

/**
 * Number, name, group pill where we matched one, optional delete/edit.
 * Read-only when onDelete/onEdit are omitted (verdict screens); editable when
 * passed (the list screen).
 */
export const IngredientRow = ({
  position,
  name,
  category,
  flagged = false,
  onDelete,
  onEdit,
}: IngredientRowProps) => (
  <li className="flex items-baseline gap-3 py-2">
    <span className="w-6 shrink-0 text-right text-[13px] tabular-nums text-ink-faint">
      {position}
    </span>

    <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
      <span
        className={`text-[15px] capitalize leading-snug ${
          flagged ? "font-semibold text-skip" : "text-ink"
        }`}
      >
        {name}
      </span>

      {category && (
        <span
          className={`rounded-full px-2 py-0.5 text-[12px] capitalize ${
            flagged ? "bg-skip-bg text-skip" : "bg-surface-2 text-ink-soft"
          }`}
        >
          {category}
        </span>
      )}
    </div>

    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${name}`}
        className="shrink-0 text-ink-soft"
      >
        <Pencil size={16} strokeWidth={1.75} aria-hidden />
      </button>
    )}

    {onDelete && (
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remove ${name}`}
        className="shrink-0 text-ink-soft"
      >
        <Trash2 size={16} strokeWidth={1.75} aria-hidden />
      </button>
    )}
  </li>
);
