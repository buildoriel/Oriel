import { promises as dns } from "dns";
import { admin } from "./supabase/admin";
import { SITES_CNAME_TARGET } from "./config";

/**
 * Automatic HTTPS: the domain is added to the Vercel project that runs Oriel.
 * Vercel issues a Let's Encrypt certificate once DNS points correctly.
 * Apex domains (no www) cannot use CNAME at many registrars: point an A record at the Vercel IP
 * (see README) or use ALIAS/flattening.
 */
const VERCEL = () => ({
  base: `https://api.vercel.com`, project: process.env.VERCEL_PROJECT_ID!,
  team: process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "",
  H: { authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`, "content-type": "application/json" },
});

export async function checkDns(hostname: string) {
  try {
    const cn = await dns.resolveCname(hostname);
    if (cn.some((c) => c.replace(/\.$/, "").toLowerCase() === SITES_CNAME_TARGET)) return { ok: true as const };
    return { ok: false as const, error: `CNAME points to ${cn.join(", ")}; it should be ${SITES_CNAME_TARGET}.` };
  } catch {
    try {
      const a = await dns.resolve4(hostname);
      const expected = (process.env.VERCEL_APEX_IPS ?? "76.76.21.21").split(",");
      if (a.some((ip) => expected.includes(ip))) return { ok: true as const };
      return { ok: false as const, error: `A record points to ${a.join(", ")}.` };
    } catch {
      return { ok: false as const, error: "DNS record not found yet. DNS changes can take up to a few hours." };
    }
  }
}

export async function attachToVercel(hostname: string) {
  const v = VERCEL();
  const r = await fetch(`${v.base}/v10/projects/${v.project}/domains${v.team}`, { method: "POST", headers: v.H, body: JSON.stringify({ name: hostname }) });
  if (!r.ok && r.status !== 409) throw new Error(`Could not add the domain to hosting: ${(await r.json()).error?.message}`);
}

export async function certReady(hostname: string) {
  const v = VERCEL();
  const r = await fetch(`${v.base}/v6/domains/${hostname}/config${v.team}`, { headers: v.H });
  const j = await r.json();
  return r.ok && j.misconfigured === false;
}

export async function detachFromVercel(hostname: string) {
  const v = VERCEL();
  await fetch(`${v.base}/v9/projects/${v.project}/domains/${hostname}${v.team}`, { method: "DELETE", headers: v.H });
}

/** One verification step (called by the "Check" button and the cron). */
export async function verifyDomain(id: string) {
  const db = admin();
  const { data: d } = await db.from("domains").select("*").eq("id", id).single();
  const r = await checkDns(d.hostname);
  if (!r.ok) { await db.from("domains").update({ status: "pending", last_error: r.error }).eq("id", id); return { status: "pending", error: r.error }; }
  await attachToVercel(d.hostname);
  const ready = await certReady(d.hostname);
  const status = ready ? "active" : "dns_ok";
  await db.from("domains").update({ status, last_error: null, verified_at: ready ? new Date().toISOString() : null }).eq("id", id);
  return { status };
}
