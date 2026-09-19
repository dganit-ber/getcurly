"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { copy } from "@/lib/copy";
import type { IngredientSuggestion } from "@/types";

interface IngredientTypeaheadProps {
  /** The committed names, in the order she typed them — label order. */
  items: string[];
  onChange: (items: string[]) => void;
}

/** Long enough that she has stopped typing, short enough to feel immediate. */
const DEBOUNCE_MS = 180;

/**
 * Type a list of ingredients, one at a time.
 *
 * A comma commits the word, which is how the label is punctuated and so how she
 * reads it out. Suggestions come from the dictionary the matcher uses, so a
 * tapped name is one we are certain to recognise — but the field takes anything,
 * because a name we don't know yet is not a reason to stop her. That word lands
 * unmatched, exactly as it would from a photo.
 */
export const IngredientTypeahead = ({ items, onChange }: IngredientTypeaheadProps) => {
  const [draft, setDraft] = useState("");
  // Held with the text they answer, so a list can never outlive its question:
  // suggestions for "cet" under a field that now reads "glycerin" are worse
  // than no suggestions at all.
  const [matches, setMatches] = useState<{ for: string; items: IngredientSuggestion[] }>({
    for: "",
    items: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const query = draft.trim();
  const suggestions = matches.for === query ? matches.items : [];

  useEffect(() => {
    // Two letters is where the answers stop being the whole dictionary.
    if (query.length < 2) return;

    // Aborted on the next keystroke, so a slow answer for "cet" can't arrive
    // after "cetearyl" and repopulate the list underneath her.
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        setMatches({ for: query, items: (await res.json()) as IngredientSuggestion[] });
      } catch {
        // No suggestions is a working plain text field, not an error worth
        // showing her.
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  /** Everything before the last comma is committed; the rest stays in hand. */
  const commit = (text: string) => {
    const parts = text.split(",");
    const tail = parts.pop() ?? "";
    const names = parts.map((part) => part.trim().replace(/\s+/g, " ")).filter(Boolean);
    if (names.length > 0) onChange([...items, ...names]);
    setDraft(tail.trimStart());
  };

  const choose = (name: string) => {
    onChange([...items, name]);
    // Emptying the field is what closes the list — `suggestions` only survives
    // as long as it matches what's in it.
    setDraft("");
    inputRef.current?.focus();
  };

  const remove = (index: number) =>
    onChange(items.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((name, i) => (
            <li key={`${name}-${i}`}>
              <button
                type="button"
                onClick={() => remove(i)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 py-1.5 pl-3 pr-2.5 text-[14px] text-ink"
              >
                {/* Position is roughly concentration (rule 5), so the number
                    she typed it at is worth keeping on screen. */}
                <span className="text-ink-faint tabular-nums">{i + 1}</span>
                {name}
                <X size={14} strokeWidth={2} aria-hidden className="text-ink-faint" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ingredient" className="text-[13px] font-medium text-ink-soft">
          {copy.manual.inputLabel}
        </label>

        <div className="relative">
          <input
            ref={inputRef}
            id="ingredient"
            value={draft}
            autoComplete="off"
            autoCapitalize="words"
            placeholder={copy.manual.placeholder}
            onChange={(event) => commit(event.target.value)}
            onKeyDown={(event) => {
              // Enter is the phone keyboard's comma. Without this it submits
              // the form and throws away what she was typing.
              if (event.key === "Enter") {
                event.preventDefault();
                if (query) choose(query);
              }
              // Backspace on an empty field takes back the last one, which is
              // where the finger already is after a mistyped entry.
              if (event.key === "Backspace" && draft === "" && items.length > 0) {
                onChange(items.slice(0, -1));
              }
            }}
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-ink"
          />

          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
              {suggestions.map((suggestion) => (
                <li key={suggestion.name}>
                  {/*
                    Rule 2: the name, and nothing about what it means. A group
                    pill here would be a verdict per row, delivered while she
                    types, on a list that isn't finished.
                  */}
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(suggestion.name)}
                    className="w-full px-3.5 py-2.5 text-left text-[15px] text-ink"
                  >
                    {suggestion.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[13px] text-ink-faint">{copy.manual.hint}</p>
      </div>
    </div>
  );
};
