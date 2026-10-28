import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://buildoriel.com";

// Served on the Oriel app host only; user sites (subdomains, custom domains) are routed to site-host by the middleware.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/workspace", "/account", "/auth/", "/connectors", "/login"] }],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
