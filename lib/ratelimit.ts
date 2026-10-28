import { admin } from "./supabase/admin";
import { HttpError } from "./supabase/server";
import { ipHash } from "./abuse";

/**
 * Per-IP fixed-window limit shared across server instances (Postgres hit_rate_limit).
 * Fails open if the database call errors, so a hiccup never blocks sign-in.
 */
export async function limitByIp(req: Request, name: string, limit: number, windowSeconds = 60) {
  const { data, error } = await admin().rpc("hit_rate_limit", { p_key: `${name}:${ipHash(req)}`, p_limit: limit, p_window_seconds: windowSeconds });
  if (!error && data === false) throw new HttpError(429, "Too many requests. Wait a minute and try again.");
}

/** Drops finished windows; run from a cron. */
export async function pruneRateLimits() {
  await admin().from("rate_limits").delete().lt("window_start", new Date(Date.now() - 3600_000).toISOString());
}
