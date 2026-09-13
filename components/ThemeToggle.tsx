"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import {
  getResolvedTheme,
  getServerResolvedTheme,
  setTheme,
  subscribeTheme,
} from "@/lib/theme";

export const ThemeToggle = () => {
  const resolved = useSyncExternalStore(
    subscribeTheme,
    getResolvedTheme,
    getServerResolvedTheme,
  );

  const toggle = () => setTheme(resolved === "dark" ? "light" : "dark");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted"
    >
      {resolved === "dark" ? (
        <Sun size={16} strokeWidth={1.75} aria-hidden />
      ) : (
        <Moon size={16} strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
};
