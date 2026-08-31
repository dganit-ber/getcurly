import { COIL_SEGMENTS } from "@/lib/coil";

export const UnderConstruction = ({ title }: { title: string }) => (
  <div className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-16 text-center">
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      {COIL_SEGMENTS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          className="coil-draw stroke-brand"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </svg>

    <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
      {title}
    </h1>
    <p className="mt-2 max-w-64 text-[13px] leading-relaxed text-muted">
      This one isn&apos;t finished yet. It&apos;s on the list.
    </p>
  </div>
);
