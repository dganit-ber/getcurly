"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandAutocomplete } from "@/components/BrandAutocomplete";
import { TypeSelect } from "@/components/TypeSelect";
import { copy } from "@/lib/copy";
import type { ProductCandidate, ProductType } from "@/lib/db.types";

interface NameBottleProps {
  scanId: number;
  barcode: string | null;
  candidates: ProductCandidate[];
  types: ProductType[];
}

/**
 * Name the bottle — optional, always (rule 1). She already has her verdict, and
 * the top line and the exit at the bottom both say so.
 *
 * The app proposes before it asks: if her list matches something we hold, that
 * is one tap. The form is the fallback, not the opening move.
 */
export const NameBottle = ({ scanId, barcode, candidates, types }: NameBottleProps) => {
  const router = useRouter();

  const [adding, setAdding] = useState(candidates.length === 0);
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [size, setSize] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const back = () => router.push(`/s/${scanId}`);

  const confirm = async (candidate: ProductCandidate) => {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/scans/${scanId}/product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: candidate.product_id }),
      });
      if ((await res.json())?.ok) back();
      else {
        setFailed(true);
        setPending(false);
      }
    } catch {
      setFailed(true);
      setPending(false);
    }
  };

  const create = async () => {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brand.trim(),
          name: name.trim(),
          type,
          size: size.trim() || null,
          barcode,
          scanId,
        }),
      });
      if ((await res.json())?.ok) back();
      else {
        setFailed(true);
        setPending(false);
      }
    } catch {
      setFailed(true);
      setPending(false);
    }
  };

  // Rule 9: a listing without a type isn't a listing.
  const complete = brand.trim() !== "" && name.trim() !== "" && type !== "";

  return (
    <>
      <p className="mt-4 text-[13px] font-medium text-accent">{copy.identify.optional}</p>

      {!adding && (
        <>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink">
            {copy.identify.heading}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
            {copy.identify.body}
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {candidates.map((candidate) => (
              <button
                key={candidate.product_id}
                type="button"
                disabled={pending}
                onClick={() => confirm(candidate)}
                className="w-full rounded-2xl border border-line bg-surface-2 p-4 text-left disabled:opacity-50"
              >
                <span className="block font-display text-[17px] font-semibold tracking-tight text-ink">
                  {candidate.brand} {candidate.name}
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-soft">
                  {copy.identify.fingerprint(candidate.matched, candidate.total)}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={() => setAdding(true)}
            className="mt-3 w-full py-2.5 text-[14px] font-medium text-accent disabled:opacity-50"
          >
            {copy.identify.noneOfThose}
          </button>
        </>
      )}

      {adding && (
        <>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink">
            {copy.identify.addPromptTitle}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
            {copy.identify.addPrompt}
          </p>

          {barcode && (
            <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4">
              <p className="text-[13px] font-medium text-ink">
                {copy.newProduct.barcodeAttached}
              </p>
              <p className="mt-0.5 font-display text-[17px] tabular-nums text-ink">
                {barcode}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                {copy.newProduct.barcodeAttachedSub}
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-4">
            <BrandAutocomplete value={brand} onChange={setBrand} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-name" className="text-[13px] font-medium text-ink-soft">
                {copy.newProduct.nameLabel}
              </label>
              <input
                id="product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={copy.newProduct.namePlaceholder}
                autoComplete="off"
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-ink"
              />
            </div>

            <TypeSelect value={type} types={types} onChange={setType} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-size" className="text-[13px] font-medium text-ink-soft">
                {copy.newProduct.sizeLabel}
              </label>
              <input
                id="product-size"
                value={size}
                onChange={(event) => setSize(event.target.value)}
                autoComplete="off"
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-ink"
              />
            </div>
          </div>

          <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">
            {copy.newProduct.notLiveYet}
          </p>

          <button
            type="button"
            onClick={create}
            disabled={!complete || pending}
            className="mt-4 w-full rounded-full bg-accent py-3.5 text-[15px] font-semibold text-on-accent disabled:opacity-40"
          >
            {copy.identify.addCta}
          </button>
        </>
      )}

      {failed && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          {copy.identify.saveFailed}
        </p>
      )}

      <button
        type="button"
        onClick={back}
        disabled={pending}
        className="mt-3 w-full py-2.5 text-[14px] text-ink-soft disabled:opacity-50"
      >
        {copy.identify.skip}
      </button>
    </>
  );
};
