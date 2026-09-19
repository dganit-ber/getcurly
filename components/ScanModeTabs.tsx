import Link from "next/link";
import { copy } from "@/lib/copy";

export type ScanMode = "barcode" | "label";

/**
 * Barcode or ingredients list.
 *
 * Links rather than client state, so the mode lives in the URL: a blocked
 * camera can send her to `?mode=label`, and she can come back to a barcode
 * scan from anywhere without this component having to be mounted first.
 */
export const ScanModeTabs = ({ mode }: { mode: ScanMode }) => (
  <nav className="mt-2 flex rounded-full border border-line bg-surface-2 p-1">
    {(
      [
        ["barcode", copy.scan.modeBarcode],
        ["label", copy.scan.modeLabel],
      ] as const
    ).map(([value, label]) => (
      <Link
        key={value}
        href={`/scan?mode=${value}`}
        aria-current={mode === value ? "page" : undefined}
        className={`flex-1 rounded-full py-2 text-center text-[14px] font-medium ${
          mode === value ? "bg-surface text-ink shadow-sm" : "text-ink-soft"
        }`}
      >
        {label}
      </Link>
    ))}
  </nav>
);
