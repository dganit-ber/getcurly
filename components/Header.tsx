"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const links = [
  { href: "/", label: "Upload an Image" },
  { href: "/profile", label: "Profile" },
  { href: "/products", label: "Products" },
  { href: "/search", label: "Search Products" },
  { href: "/useful", label: "Useful Information" },
  { href: "/aboutme", label: "Who am I" },
];

export default function Header() {
  // null = untouched (sits off-screen, no animation), true = open, false = closing
  const [open, setOpen] = useState<boolean | null>(null);

  const sidebarAnim =
    open === true ? "animate-slide-open z-40" : open === false ? "animate-slide-close" : "";

  return (
    <div className="flex h-45 w-full flex-row items-center justify-center border-b border-gray-500 bg-blue pb-1.25">
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="mr-auto inline-block h-[30%] max-w-[30%] pl-2.5"
      >
        <Image
          src="/hamburger.png"
          alt=""
          width={120}
          height={90}
          className="h-full w-auto"
        />
      </button>

      <aside
        className={`fixed -left-full top-0 h-full w-1/2 max-w-[50%] bg-blue shadow-sidebar ${sidebarAnim}`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-20 w-20 items-center justify-center border-[3px] border-black text-[75px] leading-none text-black"
        >
          x
        </button>

        <nav className="flex flex-col" onClick={() => setOpen(false)}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="curly-gradient mb-0.75 flex h-50 w-full items-center px-4 font-sans text-[50px] text-white no-underline shadow-row"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <h1 className="mr-auto font-title text-[80px] font-bold">Get Curly</h1>

      <Link href="/" className="absolute left-[20%] top-0 h-45 w-[80%]" aria-hidden />
    </div>
  );
}
