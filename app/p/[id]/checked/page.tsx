import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { createReadClient } from "@/lib/supabase/read";
import { getProduct } from "@/lib/productView";
import { onDate } from "@/lib/confidence";
import { copy } from "@/lib/copy";

// Rule 6 hangs on this date being the real one. A page cached from before her
// check would show yesterday's answer to today's question.
export const dynamic = "force-dynamic";

/**
 * What her tap did, shown as the date moving.
 *
 * A toast would give her nothing to look at. Two dated rows — what the record
 * said before, what it says now — is the whole reason to do it again on the
 * next bottle, and the reason to believe the date on someone else's.
 */
export default async function CheckedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const product = await getProduct(Number(id));
  if (!product) notFound();

  // The two most recent checks: [0] is the one she just made, [1] is whatever
  // the record said before her. No [1] means she is the first person ever.
  const supabase = createReadClient();
  const { data } = await supabase
    .from("product_checks")
    .select("created_at")
    .eq("product_id", product.id)
    .order("created_at", { ascending: false })
    .limit(2);

  const checks = (data ?? []) as { created_at: string }[];
  const before = checks[1]?.created_at ?? null;
  const now = checks[0]?.created_at ?? null;

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-16">
      <div className="mt-6 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clear-bg text-clear">
          <Check size={20} strokeWidth={2.5} aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {copy.barcode.checkedTitle}
        </h1>
      </div>

      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        {copy.barcode.checkedBody}
      </p>

      <section className="mt-5 overflow-hidden rounded-2xl border border-line">
        <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
          <span className="text-[13px] text-ink-soft">{copy.barcode.checkedBefore}</span>
          <span className="text-[14px] text-ink-soft">
            {before ? onDate(before) : copy.barcode.neverChecked}
          </span>
        </div>
        <div className="flex items-baseline justify-between bg-clear-bg px-4 py-3">
          <span className="text-[13px] font-medium text-clear">
            {copy.barcode.checkedNow}
          </span>
          <span className="font-display text-[15px] font-semibold text-clear">
            {onDate(now)}
          </span>
        </div>
      </section>

      <section className="mt-5 border-t border-line py-3">
        <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
          {copy.barcode.checkedWhatItDoesTitle}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          {copy.barcode.checkedWhatItDoes}
        </p>
      </section>

      <Link
        href={`/p/${product.id}`}
        className="mt-4 block w-full rounded-full border border-line bg-surface py-3 text-center text-[15px] font-medium text-ink"
      >
        {copy.list.back}
      </Link>
    </div>
  );
}
