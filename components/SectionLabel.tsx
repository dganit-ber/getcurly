/** The small uppercase kicker that titles a section. */
export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-faint">
    {children}
  </p>
);
