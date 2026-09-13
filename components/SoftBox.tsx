const TONES = {
  plain: "bg-surface-2",
  caution: "bg-caution-bg",
  accent: "bg-accent-bg",
} as const;

/** A soft callout: a short title and a sentence or two explaining it. */
export const SoftBox = ({
  title,
  children,
  tone = "plain",
}: {
  title: string;
  children: React.ReactNode;
  tone?: keyof typeof TONES;
}) => (
  <div className={`rounded-lg px-4 py-3.5 ${TONES[tone]}`}>
    <b className="mb-1 block font-display text-[14.5px] font-bold">{title}</b>
    <p className="text-[13px] text-ink-soft">{children}</p>
  </div>
);
