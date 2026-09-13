import { Pencil, Trash2 } from "lucide-react";

interface IngredientRowProps {
  position: number;
  name: string;
  category?: string;
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
  onDelete,
  onEdit,
}: IngredientRowProps) => (
  <li className="flex items-center gap-2.5 py-2">
    <span className="w-5 shrink-0 text-right text-xs text-muted">
      {position}
    </span>

    <div className="flex-1">
      <span className="block text-[13px] font-medium capitalize">{name}</span>
      {category && (
        <span className="mt-0.5 inline-block rounded-full bg-sunk px-2 py-0.5 text-[11px] capitalize text-muted">
          {category}
        </span>
      )}
    </div>

    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${name}`}
        className="shrink-0 text-muted"
      >
        <Pencil size={14} strokeWidth={1.75} aria-hidden />
      </button>
    )}

    {onDelete && (
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remove ${name}`}
        className="shrink-0 text-muted"
      >
        <Trash2 size={14} strokeWidth={1.75} aria-hidden />
      </button>
    )}
  </li>
);
