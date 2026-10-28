import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Nav } from "@/components/Nav";
import "./globals.css";

// Bricolage Grotesque (OFL) bundled locally: no Google Fonts dependency at build time
const bricolage = localFont({ src: "./fonts/BricolageGrotesque-Variable.ttf", weight: "200 800", variable: "--font-d", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Oriel — Build anything. Own a piece of it.", template: "%s · Oriel" },
  description: "Build anything with AI. Stake instead of subscribe. Earn while others build.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://buildoriel.com"),
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/favicon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon-180.png" },
  openGraph: { siteName: "Oriel", url: "https://buildoriel.com" },
  twitter: { site: "@buildoriel", card: "summary_large_image" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#F4F5F7" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${GeistSans.variable} ${GeistMono.variable}`}>
      <body><Nav /><main>{children}</main></body>
    </html>
  );
}
