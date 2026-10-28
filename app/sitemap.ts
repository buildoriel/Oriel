import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://buildoriel.com";
const PAGES: [string, MetadataRoute.Sitemap[number]["changeFrequency"], number][] = [
  ["/", "weekly", 1], ["/templates", "daily", 0.8], ["/tiers", "monthly", 0.8],
  ["/docs", "weekly", 0.7], ["/faq", "monthly", 0.6], ["/changelog", "weekly", 0.5],
  ["/terms", "yearly", 0.2], ["/privacy", "yearly", 0.2], ["/report", "yearly", 0.2],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map(([path, changeFrequency, priority]) => ({ url: `${BASE}${path}`, lastModified, changeFrequency, priority }));
}
