import { COIL_SEGMENTS } from "@/lib/coil";

interface CoilLoaderProps {
  /** Tailwind size classes. Defaults to the inline size used beside a heading. */
  className?: string;
}

/**
 * The waiting state: the coil draws itself from the inner turn outwards, then
 * starts again. Same mark as the verdict graphic, so the wait belongs to the
 * app rather than being a generic spinner borrowed from somewhere else.
 *
 * The stagger is per-segment and the segments are ordered inside-out, which is
 * what makes it read as filling rather than rotating.
 */
export const CoilLoader = ({ className = "h-6 w-6" }: CoilLoaderProps) => (
  <svg
    viewBox="0 0 120 120"
    // Flipped on the horizontal axis: the curl fills the other way up.
    className={`coil-loader shrink-0 -scale-y-100 ${className}`}
    role="img"
    aria-label="Working"
  >
    {COIL_SEGMENTS.map((d, i) => (
      <path
        key={i}
        d={d}
        pathLength={1}
        fill="none"
        strokeWidth={6}
        strokeLinecap="round"
        stroke="currentColor"
        style={{ animationDelay: `${i * 0.1}s` }}
      />
    ))}
  </svg>
);
