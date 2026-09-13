import { Search } from "lucide-react";

/**
 * Plain GET form — no client JS, and the query survives as a shareable URL.
 */
export const SearchRow = ({ placeholder }: { placeholder: string }) => (
  <form
    action="/search"
    className="mt-2.75 flex items-center gap-2.25 rounded-full bg-surface-2 px-4 py-2.75 text-ink-faint"
  >
    <Search size={16} strokeWidth={2.2} className="shrink-0" aria-hidden />
    <input
      type="search"
      name="q"
      autoComplete="off"
      placeholder={placeholder}
      aria-label={placeholder}
      className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
    />
  </form>
);
