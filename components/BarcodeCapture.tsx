"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Viewfinder } from "@/components/Viewfinder";
import { createFrameReader, isProductBarcode, type FrameReader } from "@/lib/barcode";
import { copy } from "@/lib/copy";

/** Between reads. Fast enough to feel instant, slow enough to leave the UI alone. */
const INTERVAL = 200;

/** How long a camera runs with nothing found before the nudge is worth showing. */
const STALLED_AFTER = 8000;

/**
 * Point the phone at a barcode, get the product.
 *
 * Rule 1: there is no shutter button and no confirm step. The frame is read on
 * a loop and the first valid code navigates — by the time she's registered that
 * it worked, the answer is loading.
 *
 * Decoding happens entirely on the device. Nothing about the barcode path
 * touches the network until we have a code to look up.
 */
export const BarcodeCapture = () => {
  const router = useRouter();
  const [stalled, setStalled] = useState(false);
  const [found, setFound] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<Promise<FrameReader> | null>(null);

  const onVideo = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    // Start loading the reader the moment there's a camera, not on mount —
    // a blocked camera shouldn't cost her a wasm download.
    if (video && !readerRef.current) readerRef.current = createFrameReader();
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      const video = videoRef.current;

      // `readyState` below HAVE_CURRENT_DATA means there is no frame yet —
      // reading one then is wasted work on the first few hundred milliseconds.
      if (video && video.readyState >= 2 && readerRef.current) {
        const read = await readerRef.current;
        const value = await read(video).catch(() => null);

        if (!stopped && value && isProductBarcode(value)) {
          stopped = true;
          setFound(true);
          router.push(`/b/${value}`);
          return;
        }
      }

      if (!stopped) timer = setTimeout(() => void tick(), INTERVAL);
    };

    void tick();
    const nudge = setTimeout(() => setStalled(true), STALLED_AFTER);

    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(nudge);
    };
  }, [router]);

  return (
    <Viewfinder
      reticle="barcode"
      hint={copy.scan.barcodeHint}
      onVideo={onVideo}
      status={
        found
          ? copy.scan.camera.lookingUp
          : stalled
            ? copy.scan.camera.stalled
            : undefined
      }
    />
  );
};
