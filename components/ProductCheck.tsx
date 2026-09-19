"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";

/**
 * "Does this match the bottle in your hand?"
 *
 * Three buttons and no wrong answer. **Not now** genuinely does nothing — no
 * guilt, no nag — because the verdict she came for is already on the screen and
 * this is the optional second tap.
 *
 * A mismatch never goes straight to a diff (rule 8): it needs a photo of the
 * current label first, so that button leads to the camera, not to a form.
 */
export const ProductCheck = ({ productId }: { productId: number }) => {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const confirm = async () => {
    setPending(true);
    try {
      const res = await fetch(`/api/products/${productId}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: "match" }),
      });
      if ((await res.json())?.ok) router.push(`/p/${productId}/checked`);
      else setPending(false);
    } catch {
      setPending(false);
    }
  };

  return (
    <section className="mt-3 border-t border-line py-3">
      <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
        {copy.barcode.checkQuestion}
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
        {copy.barcode.checkBody}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={confirm}
          className="w-full rounded-full bg-accent py-3.5 text-[15px] font-semibold text-on-accent disabled:opacity-40"
        >
          {copy.barcode.itMatches}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => router.push(`/scan?mode=label&for=${productId}`)}
          className="w-full rounded-full border border-line bg-surface py-3 text-[15px] font-medium text-ink disabled:opacity-50"
        >
          {copy.barcode.itDoesnt}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => setDismissed(true)}
          className="w-full py-2 text-[14px] text-ink-soft disabled:opacity-50"
        >
          {copy.barcode.notNow}
        </button>
      </div>
    </section>
  );
};
