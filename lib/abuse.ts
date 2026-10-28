import { createHash } from "crypto";
import { admin } from "./supabase/admin";
import { ROOT_DOMAIN } from "./config";

export const ABUSE_CATEGORIES = ["phishing", "malware", "scam", "impersonation", "illegal", "spam", "other"] as const;
export type AbuseCategory = (typeof ABUSE_CATEGORIES)[number];

/** App hosts are not user sites and cannot be reported here. */
const APP_SUBDOMAINS = new Set(["www", "app", "api", "preview", "sites"]);

/**
 * Which Oriel project serves this hostname: <slug>.buildoriel.com or an active custom domain.
 * Returns null for hosts Oriel does not serve, so reports about unrelated sites are rejected.
 */
export async function projectForHost(hostname: string): Promise<{ id: string; slug: string } | null> {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const db = admin();
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.slice(0, -(ROOT_DOMAIN.length + 1));
    if (slug.includes(".") || APP_SUBDOMAINS.has(slug)) return null;
    const { data } = await db.from("projects").select("id, slug").eq("slug", slug).maybeSingle();
    return data;
  }
  const { data } = await db.from("domains").select("projects(id, slug)").eq("hostname", host).eq("status", "active").maybeSingle();
  return (data?.projects as { id: string; slug: string } | null) ?? null;
}

/** Salted hash of the client IP: enough to rate limit, not enough to identify anyone. */
export function ipHash(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const salt = process.env.ABUSE_HASH_SALT || process.env.PREVIEW_SIGNING_SECRET || "oriel";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
