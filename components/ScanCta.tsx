import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface ScanCtaProps {
  href: string;
  title: string;
  sub: string;
  icon: LucideIcon;
  variant?: "primary" | "plain";
}

/** The big two-line call to action: icon, what it does, what it costs you. */
export const ScanCta = ({
  href,
  title,
  sub,
  icon: Icon,
  variant = "primary",
}: ScanCtaProps) => (
  <Link
    href={href}
    className={`flex w-full items-center gap-2.75 rounded-lg px-4.5 py-3.5 font-display text-[15.5px] font-bold tracking-[-0.01em] no-underline ${
      variant === "primary"
        ? "bg-accent text-on-accent shadow-soft-sm"
        : "bg-surface-2 text-ink"
    }`}
  >
    <Icon size={20} strokeWidth={2.1} className="shrink-0" aria-hidden />
    <span>
      {title}
      <small className="mt-0.5 block font-sans text-xs font-normal tracking-normal opacity-[0.82]">
        {sub}
      </small>
    </span>
  </Link>
);
