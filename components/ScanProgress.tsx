"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { CoilLoader } from "@/components/CoilLoader";
import { copy } from "@/lib/copy";

/**
 * Roughly how long each stage takes. The server doesn't stream progress, so
 * these advance on a timer — the sequence is real even though the pacing is an
 * estimate. The final step holds until the verdict actually arrives.
 */
const STEP_MS = 1500;

/** Past this, say so. A silent wait this long reads as a hang. */
const LONG_WAIT_MS = 7000;

interface ScanProgressProps {
  /**
   * The stages actually being performed. Pass only steps that really happen —
   * a step the flow never runs is what makes the screen look stuck, because it
   * can never complete.
   */
  steps?: readonly string[];
}

/**
 * The wait, narrated with the real steps rather than a bare spinner.
 *
 * Rule 2 forbids surfacing how confident a match is, but the *sequence* isn't
 * confidence — saying we're matching ingredients and checking the groups is what
 * keeps a slow OCR read feeling like work rather than a hang.
 */
export const ScanProgress = ({
  steps = copy.scan.reading.labelSteps,
}: ScanProgressProps) => {
  const [active, setActive] = useState(0);
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    if (active >= steps.length - 1) return;
    const timer = setTimeout(() => setActive((n) => n + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [active, steps.length]);

  useEffect(() => {
    const timer = setTimeout(() => setLongWait(true), LONG_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-10" aria-live="polite" aria-busy="true">
      <p className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight text-ink">
        <CoilLoader className="h-7 w-7 text-ink" />
        {copy.scan.reading.working}
      </p>

      <ul className="mt-5 flex flex-col gap-3">
        {steps.map((step, i) => {
          const done = i < active;
          const current = i === active;

          return (
            <li
              key={step}
              className={`flex items-center gap-2.5 text-[14px] transition-opacity duration-300 ${
                done || current ? "opacity-100" : "opacity-40"
              }`}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {done ? (
                  <Check size={14} strokeWidth={2.5} className="text-clear" aria-hidden />
                ) : current ? (
                  // Pulses, because this is the step we sit on while the server
                  // works — a static mark here is what reads as a hang.
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-ink"
                    aria-hidden
                  />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-line" aria-hidden />
                )}
              </span>

              <span className={done ? "text-muted" : "text-ink"}>{step}</span>
            </li>
          );
        })}
      </ul>

      {longWait && (
        <p className="mt-5 text-[13px] text-muted">{copy.scan.reading.stillGoing}</p>
      )}
    </section>
  );
};
