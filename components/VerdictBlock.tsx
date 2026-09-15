import { VerdictPill, type Verdict } from "@/components/VerdictPill";
import { copy } from "@/lib/copy";

interface VerdictBlockProps {
  verdict: Verdict;
  /** How many ingredients are behind a Skip. Ignored on a Clear. */
  flaggedCount: number;
}

/**
 * The answer, and nothing competing with it. Rule 1: this is what she came for,
 * so it sits at the top with no form, prompt or confirmation above it.
 */
export const VerdictBlock = ({ verdict, flaggedCount }: VerdictBlockProps) => (
  <section className="flex flex-col items-start gap-3 py-6">
    <VerdictPill verdict={verdict} />
    <p className="font-display text-2xl leading-snug tracking-tight text-ink">
      {verdict === "clear"
        ? copy.verdict.clearLine
        : copy.verdict.skipLine(flaggedCount)}
    </p>
  </section>
);
