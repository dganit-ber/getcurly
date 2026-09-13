import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { newFontVariables } from "./fonts";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { Header } from "@/components/Header";
import { WaveDivider } from "@/components/WaveDivider";
import { ResultProvider } from "./api/context/ResultContext";

export const metadata: Metadata = {
  title: "Get Curly",
  description:
    "Reads a hair product's ingredient label with OCR and tells you if it fits the Curly Girl method.",
};

// Runs before paint so an explicit theme choice doesn't flash the wrong palette.
const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${fontVariables} ${newFontVariables}`}>
        <ResultProvider>
          <div className="flex min-h-screen w-full flex-col items-center">
            <Header />
            <WaveDivider />
            <div className="flex w-full flex-1 flex-col items-center">
              {children}
            </div>
          </div>
        </ResultProvider>
      </body>
    </html>
  );
}
