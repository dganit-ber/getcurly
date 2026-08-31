import {
  Poppins,
  Princess_Sofia,
  Nunito,
  Fraunces,
  Karla,
} from "next/font/google";

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

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
});

export const fontVariables = [
  poppins.variable,
  princess.variable,
  nunito.variable,
  fraunces.variable,
  karla.variable,
].join(" ");
