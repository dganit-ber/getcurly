export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "gc-theme";

const THEME_CHANGE_EVENT = "gc-theme-change";

const getStoredTheme = (): ThemePreference => {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
};

/**
 * Client snapshot for useSyncExternalStore. Resolution lives here rather than
 * in the component so there is exactly one window-dependent branch, and
 * useSyncExternalStore's server/client split governs it — a plain helper that
 * checks `typeof window` would run during hydration (where window exists) and
 * disagree with what the server rendered.
 */
export const getResolvedTheme = (): ResolvedTheme => {
  const stored = getStoredTheme();
  if (stored !== "system") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

/** Server snapshot — also what React hydrates against. */
export const getServerResolvedTheme = (): ResolvedTheme => "light";

/** For useSyncExternalStore — only this tab's own writes change anything. */
export const subscribeTheme = (callback: () => void) => {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback);
};

const applyTheme = (theme: ThemePreference) => {
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
};

export const setTheme = (theme: ThemePreference) => {
  if (theme === "system") {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
};
