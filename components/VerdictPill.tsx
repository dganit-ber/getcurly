import { CircleCheck, CircleX } from "lucide-react";

export type Verdict = "clear" | "skip";

const CONTENT = {
  clear: { label: "Clear", className: "bg-clear-bg text-clear", Icon: CircleCheck },
  skip: { label: "Skip", className: "bg-skip-bg text-skip", Icon: CircleX },
} as const;

/**
 * clear | skip — pill, icon, word. The only place those colours appear.
 *
 * Weighted rather than loud: the palette stays deliberately calm, so the pill
 * earns attention through size and weight instead of a brighter colour. Always
 * icon + word, so colour is never the only signal.
 */
export const VerdictPill = ({ verdict }: { verdict: Verdict }) => {
  const { label, className, Icon } = CONTENT[verdict];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 font-display text-[17px] font-bold tracking-tight ${className}`}
    >
      <Icon size={17} strokeWidth={2.5} aria-hidden />
      {label}
    </span>
  );
};
