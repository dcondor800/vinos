import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { RegistroSW } from "./registro-sw";

/** Serif con carácter: nombres de vino y bodega. Evoca la etiqueta. */
const etiqueta = Fraunces({
  variable: "--fuente-etiqueta",
  subsets: ["latin"],
  display: "swap",
});

/** Sans neutra: toda la interfaz. */
const ui = Inter({
  variable: "--fuente-ui",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vinos",
  description: "Encuentra el vino que te va a gustar entre los que están en la feria.",
};

export const viewport: Viewport = {
  themeColor: "#17131A",
  // El catálogo se recorre con una mano; el zoom manual queda disponible.
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${etiqueta.variable} ${ui.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <RegistroSW />
      </body>
    </html>
  );
}
