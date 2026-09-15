"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import { isFlagged } from "@/lib/verdict";
import type { MatchCandidate, OpenQuestion } from "@/lib/db.types";

interface PickCardProps {
  scanId: number;
  question: OpenQuestion;
}

const meaning = (candidate: MatchCandidate) =>
  isFlagged(candidate.category, candidate.water_soluble)
    ? copy.verdict.skip
    : copy.verdict.clear;

/**
 * The one interruption in the app (rule 3).
 *
 * Rendered only from `scan_open_questions`, which returns a row exactly when a
 * word we couldn't read cleanly has candidates that disagree on the verdict.
 * Every other misread stays silent — most of them cannot change the answer, and
 * saying so would be the confidence surfacing rule 2 forbids.
 */
export const PickCard = ({ scanId, question }: PickCardProps) => {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const [first, second] = question.candidates;
  if (dismissed || !first || !second) return null;

  const choose = async (candidate: MatchCandidate) => {
    setPending(true);
    try {
      const res = await fetch(`/api/scans/${scanId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pos: question.pos, ingredientId: candidate.ingredient_id }),
      });
      const body = await res.json();
      // An edit is a new scan, never an update (rule 11), so the answer lives
      // at a new URL.
      if (body?.ok) router.push(`/s/${body.scanId}`);
      else setPending(false);
    } catch {
      setPending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
        {copy.pick.title}
      </h2>

      <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
        {copy.pick.body(first.name, meaning(first), second.name, meaning(second))}
      </p>

      <p className="mt-3 text-[13px] font-medium text-ink">{copy.pick.question}</p>

      <div className="mt-2 flex flex-col gap-2">
        {[first, second].map((candidate) => (
          <button
            key={candidate.ingredient_id}
            type="button"
            disabled={pending}
            onClick={() => choose(candidate)}
            className="w-full rounded-full border border-line bg-surface py-3 text-[15px] font-medium capitalize text-ink disabled:opacity-50"
          >
            {candidate.name}
          </button>
        ))}

        <button
          type="button"
          disabled={pending}
          onClick={() => setDismissed(true)}
          className="w-full py-2 text-[14px] text-ink-soft disabled:opacity-50"
        >
          {copy.pick.cantTell}
        </button>
      </div>
    </section>
  );
};
