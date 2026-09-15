import Link from "next/link";
import { copy } from "@/lib/copy";
import type { LabelScanFailure } from "@/types";

interface ScanErrorProps {
  reason: LabelScanFailure;
  /** How many ingredients we did read. Only meaningful for a partial read. */
  count?: number;
  onRetry: () => void;
}

/**
 * A failed scan, said plainly. The three the spec calls out — a partial read,
 * nothing readable, and our reader being down — are genuinely different
 * problems with different next steps, so they get different screens rather than
 * one "something went wrong".
 *
 * Rule 4: the framing hint appears here, on an actual failure, and nowhere else.
 */
export const ScanError = ({ reason, count, onRetry }: ScanErrorProps) => {
  const { errors } = copy.scan;

  const content = {
    partial: {
      ...errors.partial,
      body: errors.partial.body.replace("{n}", String(count ?? 0)),
    },
    no_text: errors.noText,
    not_a_label: errors.notALabel,
    ocr_down: errors.ocrDown,
    rate_limited: errors.rateLimited,
    too_large: errors.tooLarge,
    unsupported_type: errors.unsupported,
    no_file: errors.generic,
    server_error: errors.generic,
    server_misconfigured: errors.generic,
  }[reason];

  // The two failures we can't fix by retrying send her to the library instead.
  const searchInstead = reason === "ocr_down" || reason === "rate_limited";

  return (
    <section className="py-8">
      <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
        {content.title}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{content.body}</p>

      {searchInstead ? (
        <Link
          href="/search"
          className="mt-5 block w-full rounded-full border border-line py-3.5 text-center text-[15px] font-medium text-ink"
        >
          {content.action}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 w-full rounded-full border border-line py-3.5 text-center text-[15px] font-medium text-ink"
        >
          {content.action}
        </button>
      )}
    </section>
  );
};
