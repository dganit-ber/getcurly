import { COIL_SEGMENTS } from "@/lib/coil";

export const Coil = ({ tone }: { tone: string }) => (
  <svg viewBox="0 0 120 120" className="h-16 w-16 shrink-0" aria-hidden>
    {COIL_SEGMENTS.map((d, i) => (
      <path
        key={i}
        d={d}
        fill="none"
        strokeWidth={5}
        strokeLinecap="round"
        className={tone}
      />
    ))}
  </svg>
);
