"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { copy } from "@/lib/copy";

type Failure = "insecure" | "denied" | "none" | "failed";

interface ViewfinderProps {
  /** Short and wide for a barcode, tall for a paragraph of small print. */
  reticle: "barcode" | "label";
  /** What she's lining up. Sits under the frame, not over it. */
  hint: string;
  /** Called with the playing element, and with null when the stream stops. */
  onVideo: (video: HTMLVideoElement | null) => void;
  /** Status line under the hint — progress, or the stalled nudge. */
  status?: string;
}

/**
 * The live camera.
 *
 * A stream rather than a file input, because a barcode is read continuously —
 * she points the phone and the answer arrives, with no shutter button between
 * the two (rule 1). The label flow keeps its file input on purpose: the phone's
 * own camera app focuses on small print far better than a preview does.
 *
 * The stream is stopped on unmount and whenever the tab goes to the background.
 * A camera left running behind another app is a battery complaint and a privacy
 * one, and phones are quick to revoke it anyway.
 */
export const Viewfinder = ({ reticle, hint, onVideo, status }: ViewfinderProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [live, setLive] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Held in a ref so a caller redefining its handler each render doesn't tear
  // the camera down and put it back up. Declared before the camera effect so
  // it is always the current handler by the time that one runs.
  const report = useRef(onVideo);
  useEffect(() => {
    report.current = onVideo;
  }, [onVideo]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    const stop = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      setLive(false);
      report.current(null);
    };

    const start = async () => {
      // A plain http:// address hides `mediaDevices` entirely, which looks
      // exactly like a phone with no camera. Separate the two before asking,
      // or a perfectly good phone gets told it hasn't got a camera.
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setFailure("insecure");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setFailure("none");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // The back camera, and enough resolution for the bars to survive.
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
      } catch (error) {
        if (cancelled) return;
        const name = (error as DOMException)?.name;
        setFailure(
          name === "NotAllowedError" || name === "SecurityError"
            ? "denied"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "none"
              : "failed",
        );
        return;
      }

      const video = videoRef.current;
      if (cancelled || !video) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }

      video.srcObject = stream;
      // `playsInline` and the muted attribute are what stop iOS Safari opening
      // this fullscreen in its own player, where our reticle doesn't exist.
      await video.play().catch(() => undefined);

      if (cancelled) return;
      setFailure(null);
      setLive(true);
      report.current(video);
    };

    void start();

    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((n) => n + 1);
  }, []);

  if (failure) return <CameraProblem failure={failure} onRetry={retry} />;

  return (
    <div className="flex flex-col py-4">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-ink">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full object-cover ${reticle === "barcode" ? "h-64" : "h-80"}`}
        />

        {/*
          The reticle is a guide, not a crop — we read the whole frame, so a
          barcode slightly outside these corners still decodes. Its shape is
          the instruction: short and wide reads as "a barcode goes here".
        */}
        <div
          aria-hidden
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-bg/80 ${
            reticle === "barcode" ? "h-24 w-[78%]" : "h-56 w-[82%]"
          }`}
        />

        {!live && (
          <p className="absolute inset-x-0 bottom-3 text-center text-[13px] text-bg/80">
            {copy.scan.camera.opening}
          </p>
        )}
      </div>

      <p className="mt-3 text-center text-[14px] text-ink-soft">{hint}</p>
      {status && (
        <p className="mt-1 text-center text-[14px] text-ink" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
};

/**
 * No camera, or no permission for it.
 *
 * Every one of these keeps the label route on screen. A blocked camera is a
 * dead end for the barcode, never for the question she came to ask.
 */
const CameraProblem = ({
  failure,
  onRetry,
}: {
  failure: Failure;
  onRetry: () => void;
}) => {
  const text = copy.scan.camera;
  const { title, body } =
    failure === "insecure"
      ? { title: text.insecureTitle, body: text.insecure }
      : failure === "denied"
        ? { title: text.deniedTitle, body: text.denied }
        : failure === "none"
          ? { title: text.noneTitle, body: text.none }
          : { title: text.failedTitle, body: text.failed };

  return (
    <div className="py-6">
      <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{body}</p>

      <Link
        href="/scan?mode=label"
        className="mt-5 block w-full rounded-full bg-accent py-3.5 text-center text-[15px] font-semibold text-on-accent"
      >
        {text.useLabel}
      </Link>

      {failure !== "none" && failure !== "insecure" && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 w-full rounded-full border border-line bg-surface py-3 text-[15px] font-medium text-ink"
        >
          {text.retry}
        </button>
      )}
    </div>
  );
};
