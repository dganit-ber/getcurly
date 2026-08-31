"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionSectionProps {
  title: string;
  count: number;
  children: ReactNode;
}

export const AccordionSection = ({
  title,
  count,
  children,
}: AccordionSectionProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2 px-3 py-3 text-left transition-colors ${
          open ? "bg-sunk" : ""
        }`}
      >
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
        <span className="flex-1 font-display text-base font-semibold capitalize tracking-tight">
          {title}
        </span>
        <span className="text-xs text-muted">{count}</span>
      </button>

      {open && <div className="bg-sunk px-3 pb-3">{children}</div>}
    </div>
  );
};
