"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanError } from "@/components/ScanError";
import { ManualIngredients } from "@/components/ManualIngredients";
import { ScanProgress } from "@/components/ScanProgress";
import { copy } from "@/lib/copy";
import { downscaleImage } from "@/lib/downscale";
import type { LabelScanFailure, LabelScanResponse } from "@/types";

interface LabelCaptureProps {
  /** Set when she came from a product page to re-read its label. */
  productId?: string | null;
  /** Set when the barcode she scanned wasn't one we had. */
  barcode?: string | null;
}

type State =
  | { phase: "idle" }
  | { phase: "reading" }
  | { phase: "failed"; reason: LabelScanFailure; count?: number }
  | { phase: "typing" };

/**
 * Read the ingredients list. Photo in, verdict out — rule 1, so there is no
 * confirm step between choosing the picture and the answer.
 *
 * A file input with `capture` rather than a live viewfinder: the label is a
 * paragraph of small print, and the phone's own camera app focuses on it far
 * better than a `getUserMedia` preview does. The live viewfinder arrives with
 * barcode mode, which genuinely needs it.
 */
export const LabelCapture = ({ productId, barcode }: LabelCaptureProps) => {
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "idle" });
  const [preview, setPreview] = useState<string>("");

  const submit = async (file: File) => {
    setState({ phase: "reading" });

    // Shrink first: on a phone the upload dominates the wait.
    const upload = await downscaleImage(file);

    const form = new FormData();
    form.append("file", upload);
    if (productId) form.append("productId", productId);
    if (barcode) form.append("barcode", barcode);

    try {
      const res = await fetch("/api/scan/label", { method: "POST", body: form });
      const body = (await res.json()) as LabelScanResponse;

      if (body.ok) {
        router.push(`/s/${body.scanId}`);
        return; // keep the reading state on screen through the navigation
      }
      setState({ phase: "failed", reason: body.reason, count: body.count });
    } catch {
      setState({ phase: "failed", reason: "server_error" });
    }
  };

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clearing the value lets her pick the same photo again after a failed
    // read — without it `change` never fires a second time for one file.
    event.target.value = "";
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    void submit(file);
  };

  if (state.phase === "reading") return <ScanProgress />;

  if (state.phase === "failed") {
    return (
      <ScanError
        reason={state.reason}
        count={state.count}
        onRetry={() => {
          setPreview("");
          setState({ phase: "idle" });
        }}
        onTypeInstead={() => setState({ phase: "typing" })}
      />
    );
  }

  // Whatever she was carrying goes with her: typing the list instead of
  // photographing it doesn't make it a different bottle.
  if (state.phase === "typing") {
    return (
      <ManualIngredients
        productId={productId}
        barcode={barcode}
        onPhotoInstead={() => {
          setPreview("");
          setState({ phase: "idle" });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col py-4">
      {/*
        The input is a sibling of both labels, never nested inside one.
        Nesting it inside a label that also carries htmlFor for the same id
        makes the click fire twice — the label forwards to the input, and the
        input's own click bubbles back to the label. The camera then opens a
        second time, and cancelling that one fires `change` with an empty
        FileList, which looks exactly like the photo being thrown away.
      */}
      <input
        id="label-photo"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
      />

      <label
        htmlFor="label-photo"
        className="relative flex h-72 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface-2"
      >
        {preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={preview}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <p className="px-8 text-center text-[14px] leading-relaxed text-ink-soft">
            {copy.scan.labelHint}
          </p>
        )}
      </label>

      <label
        htmlFor="label-photo"
        className="mt-4 w-full cursor-pointer rounded-full bg-ink py-3.5 text-center text-[15px] font-semibold text-bg"
      >
        {copy.scan.takePhoto}
      </label>

      <p className="mt-3 text-center text-[14px] text-ink-soft">
        {copy.scan.fileLimits}
      </p>

      {/* Rule 4: reassurance, not a warning. */}
      <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
        {copy.scan.labelReassurance}
      </p>
    </div>
  );
};
