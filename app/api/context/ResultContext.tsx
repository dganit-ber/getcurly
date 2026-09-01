"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Ingredient } from "@/types";

export type OcrOutcome =
  | { status: "stop"; groups: Ingredient[][] }
  | { status: "cool" }
  | { status: "error" }
  | null;

interface ResultContextValue {
  outcome: OcrOutcome;
  setOutcome: (outcome: OcrOutcome) => void;
  /** Back to a blank scanner. Named rather than setOutcome(null) at each call
   *  site, because "clear the last scan" is the intent, not "set a value". */
  reset: () => void;
}

const ResultCtx = createContext<ResultContextValue | undefined>(undefined);

const STORAGE_KEY = "getcurly:last-outcome";

export function ResultProvider({ children }: { children: React.ReactNode }) {
  const [outcome, setOutcomeState] = useState<OcrOutcome>(null);

  // Restore the last outcome from sessionStorage after mount so /results survives a
  // refresh. This is a one-time sync from an external store, not derived state, and it
  // must run client-side only (sessionStorage is unavailable during SSR).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setOutcomeState(JSON.parse(raw) as OcrOutcome);
    } catch {
      // ignore unavailable/blocked storage
    }
  }, []);

  const setOutcome = useCallback((next: OcrOutcome) => {
    setOutcomeState(next);
    try {
      if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const reset = useCallback(() => setOutcome(null), [setOutcome]);

  return (
    <ResultCtx.Provider value={{ outcome, setOutcome, reset }}>
      {children}
    </ResultCtx.Provider>
  );
}

export function useResult() {
  const ctx = useContext(ResultCtx);
  if (!ctx) throw new Error("useResult must be used within a ResultProvider");
  return ctx;
}
