import { Plus, X } from "lucide-react";

interface IngredientRowProps {
  position: number;
  name: string;
  category?: string;
  /** Draws the row as one of the reasons for a Skip. */
  flagged?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  /** Opens an empty row directly above this one. */
  onInsertAbove?: () => void;
  /** Wording for the buttons' labels, so no copy is inlined here. */
  removeLabel?: (name: string) => string;
  insertLabel?: (name: string) => string;
}

/**
 * Number, name, group pill where we matched one, optional remove.
 *
 * Read-only when onDelete/onEdit are omitted (verdict screens); editable when
 * passed (the list screen), where the name itself is the tap target — "tap any
 * ingredient to edit it" — rather than a separate pencil.
 */
export const IngredientRow = ({
  position,
  name,
  category,
  flagged = false,
  onDelete,
  onEdit,
  onInsertAbove,
  removeLabel,
  insertLabel,
}: IngredientRowProps) => {
  const label = (
    <>
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
    </>
  );

  return (
    <li className="flex items-baseline gap-3 py-2">
      <span className="w-6 shrink-0 text-right text-[13px] tabular-nums text-ink-faint">
        {position}
      </span>

      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 text-left"
        >
          {label}
        </button>
      ) : (
        <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">{label}</div>
      )}

      {/*
        Sits on the number rather than beside the name: an ingredient the photo
        dropped belongs at a position, and the position is what she's pointing
        at. Insert-above rather than drag-to-reorder — OCR drops and mangles
        words, it rarely scrambles their order, and dragging a forty-row list on
        a phone is a worse tool for the rarer problem.
      */}
      {onInsertAbove && (
        <button
          type="button"
          onClick={onInsertAbove}
          aria-label={insertLabel?.(name)}
          className="shrink-0 self-center rounded-full p-1 text-ink-faint"
        >
          <Plus size={14} strokeWidth={2.4} aria-hidden />
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={removeLabel?.(name)}
          className="shrink-0 self-center rounded-full p-1 text-ink-faint"
        >
          <X size={14} strokeWidth={2.4} aria-hidden />
        </button>
      )}
    </li>
  );
};
