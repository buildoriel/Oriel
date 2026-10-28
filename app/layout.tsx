import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ErrorReporter } from "@/components/ErrorReporter";
import "./globals.css";

// Self-hosted variable fonts (SIL OFL, licenses in app/fonts): no Google Fonts dependency at build time.
const inter = localFont({ src: "./fonts/Inter-Variable.woff2", weight: "100 900", variable: "--font-inter", display: "swap" });
const serif = localFont({
  src: [
    { path: "./fonts/SourceSerif4-Variable.woff2", weight: "200 900", style: "normal" },
    { path: "./fonts/SourceSerif4-Variable-Italic.woff2", weight: "200 900", style: "italic" },
  ],
  variable: "--font-serif4", display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Oriel — Build anything. Own a piece of it.", template: "%s · Oriel" },
  description: "Build anything with AI. Stake instead of subscribe. Earn while others build.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://buildoriel.com"),
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/favicon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon-180.png" },
  openGraph: { siteName: "Oriel", url: "https://buildoriel.com" },
  twitter: { site: "@buildoriel", card: "summary_large_image" },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FAF9F6" }, { media: "(prefers-color-scheme: dark)", color: "#1A1917" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${GeistMono.variable}`}>
      <body>{children}<ErrorReporter /><Analytics /><SpeedInsights /></body>
    </html>
  );
}
