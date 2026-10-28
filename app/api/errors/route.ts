import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { reportError } from "@/lib/monitoring";

// Client error reports (window errors, unhandled rejections, error boundaries) -> app_errors.
// Size-capped and rate-limited per IP; per-instance memory is enough to stop a looping page from flooding.
const WINDOW_MS = 60_000, MAX_PER_WINDOW = 20, MAX_BODY = 16_000;
const hits = new Map<string, { n: number; reset: number }>();

function limited(ip: string) {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(ip);
  if (!h || h.reset < now) { hits.set(ip, { n: 1, reset: now + WINDOW_MS }); return false; }
  return ++h.n > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return new NextResponse(null, { status: 429 });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return new NextResponse(null, { status: 413 });
  let b: any;
  try { b = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  if (!b || typeof b.message !== "string") return new NextResponse(null, { status: 400 });
  let userId: string | null = null;
  try { userId = (await (await supabaseServer()).auth.getUser()).data.user?.id ?? null; } catch { /* signed out */ }
  await reportError({
    source: "client", message: b.message, stack: b.stack, url: b.url, digest: b.digest,
    userId, userAgent: req.headers.get("user-agent"),
  });
  return new NextResponse(null, { status: 204 });
}
