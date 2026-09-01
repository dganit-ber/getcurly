"use client";

import { useState } from "react";
import Image from "next/image";
import type { Ingredient, UploadResponse } from "@/types";
import { useResult } from "@/app/api/context/ResultContext";

/** Collapse the flat match list into one deduped array per ingredient type. */
const groupByType = (found: Ingredient[]): Ingredient[][] => {
  const byType = new Map<string, Map<string, Ingredient>>();

  for (const ingredient of found) {
    const group = byType.get(ingredient.type) ?? new Map<string, Ingredient>();
    group.set(ingredient.name, ingredient);
    byType.set(ingredient.type, group);
  }

  return Array.from(byType.values(), (group) => Array.from(group.values()));
};

/**
 * The camera/file step. Everything here is transient — the chosen file, its
 * preview, and whether a request is in flight. The result of the scan is not
 * kept locally; it goes straight to the context, which is what decides whether
 * this form is on screen at all.
 */
export const ScanForm = ({ productId }: { productId: string | null }) => {
  const { setOutcome } = useResult();

  const [file, setFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [waiting, setWaiting] = useState(false);

  const fileSelectedHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFile(selected);
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selected);
  };

  const uploadImage = async () => {
    if (!file) return;
    setWaiting(true);

    const formData = new FormData();
    formData.append("file", file);
    if (productId) formData.append("productId", productId);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const body = (await res.json()) as UploadResponse;

      // Only the failure variant of UploadResponse carries a `success` key, so
      // testing for the key is enough to narrow. Checking its value too makes
      // the condition compound, and TS can't narrow the union past it.
      if ("success" in body) {
        setOutcome({ status: "error" });
        return;
      }

      const matched = body.data[0] ?? [];

      setOutcome(
        matched.length > 0
          ? { status: "stop", groups: groupByType(matched) }
          : { status: "cool" },
      );
    } catch (err) {
      console.error("error in upload:", err);
      setOutcome({ status: "error" });
    } finally {
      setWaiting(false);
    }
  };

  if (waiting) {
    return (
      <Image
        src="/minifindstore_spin.gif"
        alt="loading"
        width={150}
        height={150}
        unoptimized
        className="mx-auto w-24 pt-8"
        priority
      />
    );
  }

  return (
    <div className="flex flex-col">
      <label
        htmlFor="uploader"
        className="relative flex h-75 cursor-pointer items-center justify-center overflow-hidden rounded-3xl bg-linear-160 from-[#26332f] to-[#0c1513]"
      >
        <input
          id="uploader"
          type="file"
          accept="image/*"
          capture="environment"
          name="file"
          onChange={fileSelectedHandler}
          className="hidden"
        />

        {imagePreviewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imagePreviewUrl}
            alt="preview"
            className="max-h-full max-w-full object-contain"
          />
        ) : null}

        <span className="pointer-events-none absolute left-6 top-18 h-9 w-9 rounded-md border-2 border-b-0 border-r-0 border-gold" />
        <span className="pointer-events-none absolute right-6 top-18 h-9 w-9 rounded-md border-2 border-b-0 border-l-0 border-gold" />
        <span className="pointer-events-none absolute bottom-18 left-6 h-9 w-9 rounded-md border-2 border-r-0 border-t-0 border-gold" />
        <span className="pointer-events-none absolute bottom-18 right-6 h-9 w-9 rounded-md border-2 border-l-0 border-t-0 border-gold" />

        <p className="pointer-events-none absolute inset-x-5 bottom-4 text-center text-xs text-[#e7efea]/85">
          Hold steady over the ingredients list
        </p>
      </label>

      <div className="mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={uploadImage}
          disabled={!file}
          className="w-full rounded-full bg-brand py-3.5 text-center text-[15px] font-bold text-bg disabled:opacity-45"
        >
          Scan ingredients
        </button>

        <label
          htmlFor="uploader"
          className="w-full cursor-pointer rounded-full border border-line py-3.5 text-center text-[15px] font-medium text-ink"
        >
          Choose a photo
        </label>
      </div>

      {/* Placeholder: no scan history is stored yet. */}
      <section className="mt-6 border-t border-line pt-3">
        <h3 className="mb-2 text-xs text-muted">Scanned this week</h3>
        <p className="py-2 text-[13px] text-muted">
          Nothing yet. Your scans will show up here once accounts are live.
        </p>
      </section>
    </div>
  );
};
