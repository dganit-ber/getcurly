import { CircleCheck, CircleX } from "lucide-react";

export type Verdict = "clear" | "skip";

const CONTENT = {
  clear: { label: "Clear", className: "bg-clear-bg text-clear", Icon: CircleCheck },
  skip: { label: "Skip", className: "bg-skip-bg text-skip", Icon: CircleX },
} as const;

/**
 * clear | skip — pill, icon, word. The only place those colours appear.
 *
 * Sized to be read at arm's length in a shop: this is the answer, and it should
 * not need looking for.
 */
export const VerdictPill = ({ verdict }: { verdict: Verdict }) => {
  const { label, className, Icon } = CONTENT[verdict];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 font-display text-[19px] font-bold tracking-tight ${className}`}
    >
      <Icon size={20} strokeWidth={2.25} aria-hidden />
      {label}
    </span>
  );
};
