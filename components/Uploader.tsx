"use client";

import { useState } from "react";
import Image from "next/image";
import { useResult } from "@/components/ResultContext";
import ResultView from "@/components/ResultView";
import type { Ingredient, UploadResponse } from "@/types";

export default function Uploader() {
  const { setOutcome } = useResult();

  const [file, setFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [waiting, setWaiting] = useState(false);
  const [showUploader, setShowUploader] = useState(true);

  const [myResults, setMyResults] = useState<Ingredient[][] | null>(null);
  const [myResultsEmpy, setMyResultsEmpy] = useState(false);
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
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const body = (await res.json()) as UploadResponse;

      if ("success" in body && body.success === false) {
        setShowUploader(false);
        setNoConnectioError(true);
        setWaiting(false);
        setOutcome({ status: "error" });
        return;
      }

      const goodRes = "data" in body && Array.isArray(body.data) ? body.data[0] : [];
      const goodResArray = Array.from(goodRes ?? []);

      if (goodResArray.length !== 0) {
        const sulfates: Ingredient[] = [];
        const silicones: Ingredient[] = [];
        const alcohols: Ingredient[] = [];
        const otherDrying: Ingredient[] = [];

        for (let i = 0; i < goodResArray.length; i++) {
          if (goodResArray[i].type === "sulfates") sulfates.push(goodResArray[i]);
          if (goodResArray[i].type === "silicones") silicones.push(goodResArray[i]);
          if (goodResArray[i].type === "alcohols") alcohols.push(goodResArray[i]);
          if (goodResArray[i].type === "other drying agents") otherDrying.push(goodResArray[i]);
        }

        const dedupe = (arr: Ingredient[]): Ingredient[] =>
          Array.from(new Set(arr.map((x) => JSON.stringify(x)))).map(
            (x) => JSON.parse(x) as Ingredient
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
        setMyResultsEmpy(true);
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
    <div className="flex flex-col justify-center">
      <div className="flex h-full w-full flex-col justify-center pt-10">
        {showUploader && (
          <div className="flex flex-col items-center self-center">
            <p className="w-[70%] font-sans text-[30px] font-bold">
              Hi. This website is designed to make your life easier. It&apos;s simple: click
              the frame, snap an image of a product&apos;s lable, and hit the &quot;Get
              Results&quot; button. In a few seconds you will know if this product is
              compatible with CG or not.
            </p>

            <label
              htmlFor="uploader"
              className="flex h-137.5 w-[70%] cursor-pointer flex-col items-center justify-between bg-grape p-2 font-sans text-[50px] font-bold text-black shadow-uploader"
            >
              Enter your files
              <input
                id="uploader"
                type="file"
                accept="image/*"
                name="file"
                onChange={fileSelectedHandler}
                className="hidden"
              />
              {imagePreviewUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={imagePreviewUrl} alt="preview" className="max-h-[60%] max-w-[60%]" />
              )}
              <button
                type="button"
                onClick={uploadImage}
                className="h-[20%] w-[35%] rounded-[10px] border-2 border-black bg-mint font-sans text-[40px] text-black"
              >
                Get results
              </button>
            </label>
          </div>
        )}

        {myResults && <ResultView outcome={{ status: "stop", groups: myResults }} />}
        {myResultsEmpy && <ResultView outcome={{ status: "cool" }} />}
        {noConnectioError && <ResultView outcome={{ status: "error" }} />}

        {waiting && (
          <Image
            src="/minifindstore_spin.gif"
            alt="loading"
            width={150}
            height={150}
            unoptimized
            className="w-37.5 self-center pt-7.5"
          />
        )}
      </div>
    </div>
  );
}
