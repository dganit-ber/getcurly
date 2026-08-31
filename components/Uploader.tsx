"use client";

import { useState } from "react";
import Image from "next/image";
import { ResultView } from "@/components/ResultView";
import type { Ingredient, UploadResponse } from "@/types";
import { useResult } from "@/app/contexts/ResultContext";

export const Uploader = () => {
  const { setOutcome } = useResult();

  const [file, setFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [waiting, setWaiting] = useState(false);
  const [showUploader, setShowUploader] = useState(true);

  const [myResults, setMyResults] = useState<Ingredient[][] | null>(null);
  const [myResultsEmpty, setMyResultsEmpty] = useState(false);
  const [noConnectioError, setNoConnectioError] = useState(false);

  function fileSelectedHandler(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    const reader = new FileReader();
    const selected = e.target.files?.[0];
    if (!selected) return;

    reader.onloadend = () => {
      setFile(selected);
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selected);
  }

  async function uploadImage() {
    if (!file) return;
    setWaiting(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const body = (await res.json()) as UploadResponse;

      if ("success" in body && body.success === false) {
        setShowUploader(false);
        setNoConnectioError(true);
        setWaiting(false);
        setOutcome({ status: "error" });
        return;
      }

      const goodRes =
        "data" in body && Array.isArray(body.data) ? body.data[0] : [];
      const goodResArray = Array.from(goodRes ?? []);

      if (goodResArray.length !== 0) {
        const sulfates: Ingredient[] = [];
        const silicones: Ingredient[] = [];
        const alcohols: Ingredient[] = [];
        const otherDrying: Ingredient[] = [];

        for (let i = 0; i < goodResArray.length; i++) {
          if (goodResArray[i].type === "sulfates")
            sulfates.push(goodResArray[i]);
          if (goodResArray[i].type === "silicones")
            silicones.push(goodResArray[i]);
          if (goodResArray[i].type === "alcohols")
            alcohols.push(goodResArray[i]);
          if (goodResArray[i].type === "other drying agents")
            otherDrying.push(goodResArray[i]);
        }

        const dedupe = (arr: Ingredient[]): Ingredient[] =>
          Array.from(new Set(arr.map((x) => JSON.stringify(x)))).map(
            (x) => JSON.parse(x) as Ingredient,
          );

        const groups = [
          dedupe(sulfates),
          dedupe(silicones),
          dedupe(alcohols),
          dedupe(otherDrying),
        ];

        setMyResults(groups);
        setWaiting(false);
        setShowUploader(false);
        setOutcome({ status: "stop", groups });
      } else {
        setMyResultsEmpty(true);
        setWaiting(false);
        setShowUploader(false);
        setOutcome({ status: "cool" });
      }
    } catch (err) {
      console.error("error in upload:", err);
      setWaiting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-5">
      {showUploader && (
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
              disabled={!file || waiting}
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
      )}

      {myResults && (
        <ResultView outcome={{ status: "stop", groups: myResults }} />
      )}
      {myResultsEmpty && <ResultView outcome={{ status: "cool" }} />}
      {noConnectioError && <ResultView outcome={{ status: "error" }} />}

      {waiting && (
        <Image
          src="/minifindstore_spin.gif"
          alt="loading"
          width={150}
          height={150}
          unoptimized
          className="mx-auto w-24 pt-8"
          priority
        />
      )}
    </div>
  );
};
