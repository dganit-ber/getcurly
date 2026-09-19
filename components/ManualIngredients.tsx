"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IngredientTypeahead } from "@/components/IngredientTypeahead";
import { copy } from "@/lib/copy";
import type { ManualScanResponse } from "@/types";

/** Matches MIN_ITEMS in the route, which is the one that actually decides. */
const MIN_ITEMS = 5;

interface ManualIngredientsProps {
  /** Carried from the scan she was in the middle of, when there was one. */
  productId?: string | null;
  barcode?: string | null;
  /** Back to the camera — this screen is the second choice, not a dead end. */
  onPhotoInstead: () => void;
}

/**
 * The list, typed out.
 *
 * Reached from a photo that only caught part of the label — a curved bottle,
 * worn print, a label behind shrink wrap. Nothing here works out a verdict: it
 * collects words and posts them, and the database matches and decides, so a
 * typed list is judged by exactly the rules a photographed one is.
 */
export const ManualIngredients = ({
  productId,
  barcode,
  onPhotoInstead,
}: ManualIngredientsProps) => {
  const router = useRouter();
  const [items, setItems] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const short = MIN_ITEMS - items.length;

  const submit = async () => {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch("/api/scan/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, productId, barcode }),
      });
      const body = (await res.json()) as ManualScanResponse;
      if (body.ok) {
        router.push(`/s/${body.scanId}`);
        return; // hold the pending state through the navigation
      }
      setFailed(true);
      setPending(false);
    } catch {
      setFailed(true);
      setPending(false);
    }
  };

  return (
    <section className="py-6">
      <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
        {copy.manual.title}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        {copy.manual.body}
      </p>

      <div className="mt-6">
        <IngredientTypeahead items={items} onChange={setItems} />
      </div>

      <p className="mt-4 text-[13px] text-ink-faint">
        {copy.manual.count(items.length)}
        {short > 0 && items.length > 0 && ` · ${copy.manual.minimum(short)}`}
      </p>

      <button
        type="button"
        onClick={submit}
        disabled={short > 0 || pending}
        className="mt-3 w-full rounded-full bg-accent py-3.5 text-[15px] font-semibold text-on-accent disabled:opacity-40"
      >
        {copy.manual.submit}
      </button>

      {failed && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          {copy.manual.failed}
        </p>
      )}

      <button
        type="button"
        onClick={onPhotoInstead}
        disabled={pending}
        className="mt-2 w-full py-3 text-center text-[14px] text-ink-soft disabled:opacity-50"
      >
        {copy.manual.photoInstead}
      </button>
    </section>
  );
};
