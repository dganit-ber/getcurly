/** One of the six groups. `ok` is the CG-safe one — the only green chip. */
export const GroupChip = ({
  label,
  tone = "ruled-out",
}: {
  label: string;
  tone?: "ruled-out" | "ok";
}) => (
  <span
    className={`rounded-full px-3.25 py-1.5 text-[12.5px] font-semibold ${
      tone === "ok" ? "bg-clear-bg text-clear" : "bg-skip-bg text-skip"
    }`}
  >
    {label}
  </span>
);
