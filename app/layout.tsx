import type { Metadata } from "next";
import { Poppins, Princess_Sofia, Nunito } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ResultProvider } from "@/components/ResultContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
});

const princess = Princess_Sofia({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-princess",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-nunito",
});

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
      <body className={`${poppins.variable} ${princess.variable} ${nunito.variable}`}>
        <ResultProvider>
          <div className="flex min-h-screen w-full flex-col items-center">
            <Header />
            <div className="flex w-full flex-1 flex-col items-center justify-center">
              {children}
            </div>
          </div>
        </ResultProvider>
      </body>
    </html>
  );
}
