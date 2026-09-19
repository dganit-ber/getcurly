import Link from "next/link";
import { notFound } from "next/navigation";
import { getConfidence, mayShowVerdict } from "@/lib/confidence";
import { getProduct, storedIngredients } from "@/lib/productView";
import { isNotHair } from "@/lib/hairProduct";
import { VerdictPill } from "@/components/VerdictPill";
import { CautionNote } from "@/components/CautionNote";
import { LastChecked } from "@/components/LastChecked";
import { IngredientRow } from "@/components/IngredientRow";
import { ProductCheck } from "@/components/ProductCheck";
import { copy } from "@/lib/copy";
import type { Verdict } from "@/components/VerdictPill";

// Rule 6 hangs on this date being the real one. A page cached from before her
// check would show yesterday's answer to today's question.
export const dynamic = "force-dynamic";

/** Enough of the list to recognise the bottle, not so much it becomes the page. */
const PREVIEW = 6;

/**
 * A product, reached by barcode.
 *
 * The order here is the rule, not a layout preference: confidence is read
 * before anything decides whether a verdict exists (rule 7), and the caution
 * and the last-checked date sit directly under the verdict rather than behind a
 * tap (rule 6).
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const product = await getProduct(Number(id));
  if (!product) notFound();

  const confidence = await getConfidence(product.id);
  const list = storedIngredients(product);
  const name = [product.brand, product.name].filter(Boolean).join(" ");

  // The library is a whole-cosmetics import, so a nail treatment or a leather
  // conditioner can carry a perfectly good barcode. A Curly Girl verdict on
  // either would be worse than saying nothing.
  const notHair = isNotHair(product.name ?? "", product.type ?? "");

  // Rule 7. Never render a pill without asking first.
  const showVerdict = !notHair && mayShowVerdict(confidence) && product.verdict !== null;

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-16">
      <p className="mt-4 text-[13px] text-ink-soft">{copy.barcode.matchedBy}</p>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
        {name}
      </h1>

      {showVerdict && (
        <>
          <div className="mt-4">
            <VerdictPill verdict={product.verdict as Verdict} />
          </div>
          <CautionNote />
        </>
      )}

      {notHair && (
        <section className="mt-4 rounded-2xl border border-line bg-surface-2 p-4">
          <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
            {copy.notHair.title}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
            {copy.notHair.body(name)}
          </p>
          <Link
            href="/scan?mode=barcode"
            className="mt-3 inline-block text-[14px] font-medium text-accent"
          >
            {copy.notHair.scanAnother}
          </Link>
        </section>
      )}

      {!notHair && !showVerdict && (
        <section className="mt-4 rounded-2xl border border-line bg-surface-2 p-4">
          <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
            {copy.barcode.seedOnlyTitle}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
            {copy.barcode.seedOnly}
          </p>
          <Link
            href={`/scan?mode=label&for=${product.id}`}
            className="mt-3 block w-full rounded-full bg-accent py-3.5 text-center text-[15px] font-semibold text-on-accent"
          >
            {copy.scan.takePhoto}
          </Link>
        </section>
      )}

      {confidence && !notHair && <LastChecked confidence={confidence} />}

      {list.length > 0 && (
        <section className="mt-3 border-t border-line py-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[13px] font-medium text-ink-soft">
              {copy.barcode.listWeHave}
            </h2>
            <span className="text-[14px] text-ink-soft">{list.length}</span>
          </div>
          <ul className="mt-1">
            {list.slice(0, PREVIEW).map((item) => (
              <IngredientRow key={item.pos} position={item.pos} name={item.name} />
            ))}
          </ul>
          {list.length > PREVIEW && (
            <p className="mt-1 text-[13px] text-ink-soft">
              {copy.list.showRest(list.length - PREVIEW)}
            </p>
          )}
        </section>
      )}

      {!notHair && <ProductCheck productId={product.id} />}
    </div>
  );
}
