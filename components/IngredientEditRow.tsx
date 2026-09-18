"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";

interface IngredientEditRowProps {
  position: number;
  /** The wording to start from. Empty for a row she's adding. */
  initial: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

/**
 * One row in edit mode: number, a plain text field, Save.
 *
 * What she types is looked up again in the dictionary server-side, so this
 * component never decides what an ingredient *is* — only what it's called.
 */
export const IngredientEditRow = ({
  position,
  initial,
  onSave,
  onCancel,
}: IngredientEditRowProps) => {
  const [text, setText] = useState(initial);
  const input = useRef<HTMLInputElement>(null);

  // Opening the row should put her straight into it — on a phone that means the
  // keyboard comes up without a second tap.
  useEffect(() => input.current?.focus(), []);

  const trimmed = text.trim();

  const commit = () => {
    if (trimmed.length > 0) onSave(trimmed);
    else onCancel();
  };

  return (
    <li className="flex items-center gap-3 py-2">
      <span className="w-6 shrink-0 text-right text-[13px] tabular-nums text-ink-faint">
        {position}
      </span>

      <input
        ref={input}
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") onCancel();
        }}
        aria-label={copy.list.editLabel(position)}
        placeholder={copy.list.newPlaceholder}
        maxLength={120}
        className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[15px] text-ink"
      />

      <button
        type="button"
        onClick={commit}
        className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[13px] font-medium text-on-accent"
      >
        {copy.list.save}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 py-1.5 text-[13px] text-ink-soft"
      >
        {copy.list.cancel}
      </button>
    </li>
  );
};
