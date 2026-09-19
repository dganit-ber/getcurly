// app/fonts.ts — self-hosted via next/font, so no request to Google at runtime.
import { Gabarito, Hanken_Grotesk } from "next/font/google";

export const display = Gabarito({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-gabarito",
  display: "swap",
});

export const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

export const newFontVariables = `${display.variable} ${sans.variable}`;
