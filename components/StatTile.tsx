/** One library count. The number is the point, so it leads. */
export const StatTile = ({
  value,
  label,
  tone = "plain",
}: {
  value: number;
  label: string;
  tone?: "plain" | "ok";
}) => (
  <div
    className={`rounded-lg px-3.75 py-3.25 ${
      tone === "ok" ? "bg-clear-bg" : "bg-surface-2"
    }`}
  >
    <b className="block font-display text-[26px] font-extrabold leading-none tracking-[-0.03em]">
      {value.toLocaleString("en-GB")}
    </b>
    <span className="mt-1.25 block text-[11.5px] text-ink-soft">{label}</span>
  </div>
);
