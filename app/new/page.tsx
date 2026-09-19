import Link from "next/link";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";

/**
 * A barcode we don't have.
 *
 * Rule 9: a barcode on its own isn't a product, so nothing is created here. She
 * gets the one thing that still works on an unknown bottle — reading the label,
 * which answers her actual question without us knowing what she's holding.
 *
 * Step 08 turns this into the two option cards that build a real listing. Until
 * then it stays honest about what we have and gets out of her way.
 */
export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  const { barcode } = await searchParams;
  if (!barcode) redirect("/scan?mode=barcode");

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-16">
      <p className="mt-4 text-[13px] text-ink-soft">{copy.newProduct.notInLibrary}</p>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
        {copy.newProduct.heading}
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        {copy.newProduct.body(barcode)}
      </p>

      {/*
        The barcode rides along to the camera. Without it the scan it produces
        has no code on it, and the form at the end of that scan — which does
        attach one — has nothing to attach.
      */}
      <Link
        href={`/scan?mode=label&barcode=${encodeURIComponent(barcode)}`}
        className="mt-6 block w-full rounded-full bg-accent py-3.5 text-center text-[15px] font-semibold text-on-accent"
      >
        {copy.scan.takePhoto}
      </Link>

      <Link
        href="/"
        className="mt-2 block w-full py-3 text-center text-[14px] text-ink-soft"
      >
        {copy.barcode.notNow}
      </Link>
    </div>
  );
}
