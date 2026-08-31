"use client";

import Link from "next/link";
import { useResult } from "@/components/ResultContext";
import { ResultView } from "@/components/ResultView";

export default function ResultsPage() {
  const { outcome } = useResult();

  if (!outcome) {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-8">
        <p className="font-display text-2xl font-semibold tracking-tight">
          No results yet
        </p>
        <Link
          href="/"
          className="mt-3 inline-block text-sm font-bold text-brand"
        >
          Upload a product label first
        </Link>
      </div>
    );
  }

  return <ResultView outcome={outcome} />;
}
