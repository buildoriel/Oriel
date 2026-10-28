import { admin } from "./supabase/admin";

/**
 * Error tracking without a third-party account: client and server errors go to the app_errors table
 * (service role only) and to the console, so they also show up in Vercel's runtime logs.
 */
export type ErrorReport = {
  source: "client" | "server";
  message: string;
  stack?: string | null;
  url?: string | null;
  digest?: string | null;
  userId?: string | null;
  userAgent?: string | null;
};

const cap = (v: unknown, n: number) => (typeof v === "string" && v ? v.slice(0, n) : null);

/** Pure: trim a report to safe sizes. Returns null when there is no usable message. */
export function cleanReport(r: Partial<ErrorReport> & { source: ErrorReport["source"] }) {
  const message = cap(r.message, 1000);
  if (!message) return null;
  return {
    source: r.source, message,
    stack: cap(r.stack, 8000), url: cap(r.url, 1000), digest: cap(r.digest, 200),
    user_id: r.userId ?? null, user_agent: cap(r.userAgent, 400),
  };
}

/** Store an error. Never throws: monitoring must not break the request that failed. */
export async function reportError(r: ErrorReport) {
  const row = cleanReport(r);
  if (!row) return;
  console.error(`[${row.source} error]`, row.message, row.url ?? "", row.digest ?? "", row.stack ?? "");
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    await admin().from("app_errors").insert(row);
  } catch (e) {
    console.error("reportError: could not store the error", e);
  }
}
