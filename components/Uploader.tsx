"use client";

import { useSearchParams } from "next/navigation";
import { ResultView } from "@/components/ResultView";
import { ScanForm } from "@/components/ScanForm";
import { RescanBanner } from "@/components/RescanBanner";
import { useResult } from "@/app/api/context/ResultContext";

/**
 * The home screen. Holds no state of its own — the context decides whether
 * we're looking at the scanner or at a result, which is why navigating home
 * from anywhere (including the logo, a soft navigation that never unmounts
 * this component) can clear the screen.
 */
export const Uploader = () => {
  const { outcome, reset } = useResult();

  // Set when the user arrived from a product card via /?rescan=<id>. The name
  // is passed along purely so the banner can be drawn without a second fetch —
  // it is never sent back to the server, so a tampered value affects nothing.
  const params = useSearchParams();
  const rescanId = params.get("rescan");
  const rescanName = params.get("name");

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-5">
      {outcome ? (
        <>
          <ResultView outcome={outcome} />

          <button
            type="button"
            onClick={reset}
            className="mt-6 w-full rounded-full border border-line py-3.5 text-center text-[15px] font-medium text-ink"
          >
            Scan another product
          </button>
        </>
      ) : (
        <>
          {rescanId && <RescanBanner name={rescanName} />}
          <ScanForm productId={rescanId} />
        </>
      )}
    </div>
  );
};
