"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { OcrOutcome } from "@/components/ResultContext";

const growLine = (
  <p className="grow self-center text-center font-sans text-[30px]">
    help us grow! Add this produt to our <Link href="/products">Database</Link>
  </p>
);

export default function ResultView({ outcome }: { outcome: NonNullable<OcrOutcome> }) {
  const [openPanels, setOpenPanels] = useState<Record<number, boolean>>({});
  const toggle = (i: number) =>
    setOpenPanels((prev) => ({ ...prev, [i]: !prev[i] }));

  if (outcome.status === "error") {
    return (
      <div className="flex w-full flex-col items-center">
        <Image
          src="/1_NWsriD1xdDlAlbm4tmjz4g.jpeg"
          alt=""
          width={800}
          height={450}
          className="w-4/5 self-center"
        />
        <p className="max-w-[60%] self-center font-sans text-[30px] font-bold">
          On no! Something went wrong :( We&apos;re not exactly sury why, but please try
          again! Make sure you are loading an image with text on it.
        </p>
      </div>
    );
  }

  if (outcome.status === "cool") {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="flex h-25 items-center justify-around">
          <Image src="/go.png" alt="" width={50} height={50} className="h-12.5 w-auto" />
          <p className="font-sans text-[30px] font-bold">
            COOL! This product Is cool for curlies.
          </p>
        </div>
        <div>{growLine}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex h-25 items-center justify-around">
        <Image src="/stop.png" alt="" width={50} height={50} className="h-12.5 w-auto" />
        <p className="font-sans text-[30px] font-bold">
          STOP! This product isnt compatible with the CG method.
        </p>
      </div>

      <div className="flex w-full flex-col items-center">
        {outcome.groups.map((group, i) =>
          group[0] ? (
            <div key={i} className="w-full">
              <button
                type="button"
                onClick={() => toggle(i)}
                className="curly-gradient w-full cursor-pointer border-none px-[15%] py-4.5 text-left font-sans text-[30px] capitalize text-[#444] shadow-row outline-none transition"
              >
                {group[0].type}
              </button>
              {openPanels[i] && (
                <div className="w-full self-start overflow-hidden bg-white px-4.5 font-sans text-[20px] capitalize">
                  {group.map((result, item) => (
                    <p key={item} className="capitalize">
                      {result.name}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : null
        )}
      </div>

      {growLine}
    </div>
  );
}
