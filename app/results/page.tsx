"use client";

import Link from "next/link";
import { useResult } from "@/components/ResultContext";
import ResultView from "@/components/ResultView";

export default function ResultsPage() {
  const { outcome } = useResult();

  if (!outcome) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="font-sans text-[30px]">No results yet.</p>
        <Link href="/" className="font-sans text-[20px] underline">
          Upload a product label first
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center pt-10">
      <ResultView outcome={outcome} />
    </div>
  );
}
