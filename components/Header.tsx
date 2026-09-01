"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useResult } from "@/app/api/context/ResultContext";

const links = [
  { href: "/", label: "Upload an Image" },
  { href: "/profile", label: "Profile" },
  { href: "/products", label: "Products" },
  { href: "/useful", label: "Useful Information" },
  { href: "/aboutme", label: "Who am I" },
];

export const Header = () => {
  const { reset } = useResult();

  // null = untouched (sits off-screen, no animation), true = open, false = closing
  const [open, setOpen] = useState<boolean | null>(null);

  const sidebarAnim =
    open === true
      ? "animate-slide-open z-40"
      : open === false
        ? "animate-slide-close"
        : "";

  return (
    <header className="flex w-full items-center gap-2.5 px-5 pb-3 pt-2.5">
      <Link
        href="/"
        onClick={reset}
        className="font-display text-xl font-semibold tracking-tight text-brand no-underline"
      >
        get curly
      </Link>

      <span className="flex-1" />

      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted"
      >
        <Menu size={16} strokeWidth={1.75} aria-hidden />
      </button>

      <aside
        className={`fixed -left-full top-0 z-40 h-full w-3/4 max-w-75 bg-surface shadow-sidebar ${sidebarAnim}`}
      >
        <div className="flex justify-end p-4">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted"
          >
            <X size={14} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <nav className="flex flex-col" onClick={() => setOpen(false)}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={link.href === "/" ? reset : undefined}
              className="border-t border-line px-5 py-4 text-sm font-medium text-ink no-underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
    </header>
  );
};
