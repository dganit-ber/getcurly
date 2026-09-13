import { CircleCheck, CircleX } from "lucide-react";

export type Verdict = "clear" | "skip";

const CONTENT = {
  clear: { label: "Clear", className: "bg-clear-bg text-clear", Icon: CircleCheck },
  skip: { label: "Skip", className: "bg-skip-bg text-skip", Icon: CircleX },
} as const;

/** clear | skip — pill, icon, word. The only place those colours appear. */
export const VerdictPill = ({ verdict }: { verdict: Verdict }) => {
  const { label, className, Icon } = CONTENT[verdict];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-sm font-semibold tracking-tight ${className}`}
    >
      <Icon size={14} strokeWidth={2} aria-hidden />
      {label}
    </span>
  );
};
