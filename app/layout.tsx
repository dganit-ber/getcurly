import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { ResultProvider } from "@/components/ResultContext";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Get Curly",
  description:
    "Reads a hair product's ingredient label with OCR and tells you if it fits the Curly Girl method.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={fontVariables}>
        <ResultProvider>
          <div className="flex min-h-screen w-full flex-col items-center">
            <Header />
            <div className="flex w-full flex-1 flex-col items-center">
              {children}
            </div>
          </div>
        </ResultProvider>
      </body>
    </html>
  );
}
