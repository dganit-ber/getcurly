"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { IngredientRow } from "@/components/IngredientRow";
import { IngredientEditRow } from "@/components/IngredientEditRow";
import { copy } from "@/lib/copy";
import type { ScanIngredient } from "@/lib/db.types";

/** Twelve is what fits before the list stops being scannable on a phone. */
const VISIBLE = 12;

interface Entry {
  key: string;
  /**
   * Where the row sat on the scan she opened. Null for one she's adding, which
   * has no position there yet.
   */
  pos: number | null;
  name: string;
  category?: string;
  edited: boolean;
}

interface EditableIngredientListProps {
  scanId: number;
  counted: ScanIngredient[];
}

const groupLabel = (category: string) =>
  category in copy.groups
    ? copy.groups[category as keyof typeof copy.groups]
    : undefined;

const toEntry = (item: ScanIngredient): Entry => ({
  key: `row-${item.id}`,
  pos: item.pos,
  // Rule 5: what we counted, not what we read. If OCR said "Cetearyl Alcohoi"
  // and we matched cetearyl alcohol, that's what she sees and edits.
  name: item.resolved_name ?? item.raw_text,
  category: groupLabel(item.category),
  edited: false,
});

/**
 * The list she can correct.
 *
 * Nothing here decides a verdict. It collects what she changed and posts it;
 * the database re-matches the words and works the answer out again, so the same
 * rules apply whether a correction comes from this screen or from a fresh scan.
 */
export const EditableIngredientList = ({
  scanId,
  counted,
}: EditableIngredientListProps) => {
  const router = useRouter();

  const [entries, setEntries] = useState<Entry[]>(() => counted.map(toEntry));
  const [removed, setRemoved] = useState<number[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  // A counter rather than a timestamp: two rows added inside the same
  // millisecond would share a key, and React would reuse one row's open editor
  // for the other.
  const added = useRef(0);
  const newKey = () => `new-${(added.current += 1)}`;

  const changed =
    removed.length > 0 || entries.some((entry) => entry.edited || entry.pos === null);

  const shown = expanded ? entries : entries.slice(0, VISIBLE);
  const rest = entries.length - shown.length;

  const remove = (entry: Entry) => {
    setEntries((current) => current.filter((item) => item.key !== entry.key));
    // Only a row that exists on the scan needs reporting; one she added and
    // then dropped never reaches the server at all.
    if (entry.pos !== null) setRemoved((current) => [...current, entry.pos!]);
    if (editing === entry.key) setEditing(null);
  };

  const save = (key: string, text: string) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.key === key
          ? // The group pill goes until the server tells us what this is now —
            // showing the old one beside new wording would be a claim we can't
            // stand behind.
            { ...entry, name: text, category: undefined, edited: true }
          : entry,
      ),
    );
    setEditing(null);
  };

  const cancel = (entry: Entry) => {
    // An empty row she opened with "add one we missed" and then abandoned
    // shouldn't linger.
    if (entry.pos === null && entry.name === "") remove(entry);
    else setEditing(null);
  };

  const addMissed = () => {
    const key = newKey();
    setEntries((current) => [...current, { key, pos: null, name: "", edited: false }]);
    setExpanded(true);
    setEditing(key);
  };

  /** An empty row directly above this one, for something the photo dropped. */
  const insertAbove = (entry: Entry) => {
    const key = newKey();
    setEntries((current) => {
      const at = current.findIndex((item) => item.key === entry.key);
      const next = [...current];
      next.splice(at, 0, { key, pos: null, name: "", edited: false });
      return next;
    });
    setEditing(key);
  };

  /**
   * Where an added row goes, said in terms the server can act on: the position
   * of the first row below it that exists on the scan she opened.
   *
   * Read downwards rather than up so a run of inserts above the same row keeps
   * the order she typed them in, and so an insert above another insert resolves
   * to the same anchor instead of to nothing. Null means the end of the list.
   */
  const anchorFor = (index: number): number | null => {
    for (let i = index + 1; i < entries.length; i++) {
      if (entries[i].pos !== null) return entries[i].pos;
    }
    return null;
  };

  const recompute = async () => {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/scans/${scanId}/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edits: entries
            .filter((entry) => entry.edited && entry.pos !== null)
            .map((entry) => ({ pos: entry.pos, text: entry.name })),
          removed,
          added: entries
            .map((entry, i) => ({ text: entry.name, before: anchorFor(i), pos: entry.pos }))
            .filter((entry) => entry.pos === null && entry.text !== "")
            .map(({ text, before }) => ({ text, before })),
        }),
      });
      const body = await res.json();
      // An edit is a new scan, never an update (rule 11), so the answer lives
      // at a new URL.
      if (body?.ok) router.push(`/s/${body.scanId}`);
      else {
        setFailed(true);
        setPending(false);
      }
    } catch {
      setFailed(true);
      setPending(false);
    }
  };

  return (
    <>
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium text-ink-soft">
          {copy.list.inLabelOrder}
        </h2>
        <button
          type="button"
          onClick={addMissed}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-accent"
        >
          <Plus size={14} strokeWidth={2.25} aria-hidden />
          {copy.list.addMissed}
        </button>
      </div>

      <ul className="mt-1 divide-y divide-line">
        {shown.map((entry, i) =>
          editing === entry.key ? (
            <IngredientEditRow
              key={entry.key}
              position={i + 1}
              initial={entry.name}
              onSave={(text) => save(entry.key, text)}
              onCancel={() => cancel(entry)}
            />
          ) : (
            <IngredientRow
              key={entry.key}
              position={i + 1}
              name={entry.name}
              category={entry.category}
              removeLabel={copy.list.removeLabel}
              insertLabel={copy.list.insertLabel}
              onEdit={() => setEditing(entry.key)}
              onDelete={() => remove(entry)}
              onInsertAbove={() => insertAbove(entry)}
            />
          ),
        )}
      </ul>

      {rest > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 text-[14px] font-medium text-accent"
        >
          {copy.list.showRest(rest)}
        </button>
      )}

      <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">
        {copy.list.orderNote}
      </p>

      <button
        type="button"
        onClick={recompute}
        disabled={!changed || pending}
        className="mt-5 w-full rounded-full bg-accent py-3.5 text-[15px] font-semibold text-on-accent disabled:opacity-40"
      >
        {copy.list.recompute}
      </button>

      {failed && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          {copy.list.recomputeFailed}
        </p>
      )}
    </>
  );
};
