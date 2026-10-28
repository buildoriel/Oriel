import { admin } from "./supabase/admin";

/**
 * Transactional email through Resend's HTTP API (no SDK).
 *   RESEND_API_KEY  required to send; without it every email is skipped (logged only)
 *   EMAIL_FROM      sender, default "Oriel <hello@buildoriel.com>" (the domain must be verified in Resend)
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://buildoriel.com";

export async function sendEmail(m: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.info(`email skipped (RESEND_API_KEY not set): "${m.subject}"`); return false; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Oriel <hello@buildoriel.com>", to: [m.to], subject: m.subject, html: m.html, text: m.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return true;
}

// ---------- rules (pure, tested in scripts/email.test.ts) ----------

/** Builds shorter than this were most likely watched in the open tab, so no email. */
export const BUILD_EMAIL_MIN_MS = 60_000;
export const LOW_CREDITS_PCT = 0.15;
export const LOW_CREDITS_REPEAT_MS = 7 * 24 * 3600_000;

export function buildEmailDue(startedAt: string | Date, finishedAt: Date, optedIn: boolean) {
  return optedIn && finishedAt.getTime() - new Date(startedAt).getTime() >= BUILD_EMAIL_MIN_MS;
}

/** True when the balance just fell below 15% of the plan's monthly credits and we have not emailed in the last 7 days. */
export function lowCreditsDue(o: { total: number; monthlyCredits: number; optedIn: boolean; lastEmailedAt: string | null; now: Date }) {
  if (!o.optedIn || o.monthlyCredits <= 0) return false;
  if (o.total >= o.monthlyCredits * LOW_CREDITS_PCT) return false;
  return !o.lastEmailedAt || o.now.getTime() - new Date(o.lastEmailedAt).getTime() >= LOW_CREDITS_REPEAT_MS;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Pure: a simple branded email with one button. */
export function layoutEmail(o: { heading: string; body: string; cta: string; href: string; footer: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#FAF9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#1D1C1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F6;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E7E4DD;border-radius:14px">
<tr><td style="padding:28px 32px 0"><img src="${APP_URL}/oriel-lockup-light.svg" alt="Oriel" height="24" style="height:24px;width:auto;display:block"></td></tr>
<tr><td style="padding:24px 32px 8px"><h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.25">${esc(o.heading)}</h1></td></tr>
<tr><td style="padding:8px 32px 0;font-size:15px;line-height:1.6;color:#4A4843">${esc(o.body)}</td></tr>
<tr><td style="padding:24px 32px 28px"><a href="${esc(o.href)}" style="display:inline-block;background:#1D1C1A;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:500;padding:11px 18px;border-radius:9px">${esc(o.cta)}</a></td></tr>
</table>
<p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#8A867E">${esc(o.footer)}</p>
</td></tr></table></body></html>`;
  const text = `${o.heading}\n\n${o.body}\n\n${o.cta}: ${o.href}\n\n${o.footer}`;
  return { html, text };
}

const PREFS_FOOTER = "You can turn these emails off in Account → Email notifications.";

async function emailOf(userId: string) {
  const { data } = await admin().auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

// ---------- triggers (never throw: an email problem must not fail a build or a charge) ----------

/** After a run finishes: email the person who started it if the build took a while and they opted in. */
export async function notifyBuildDone(o: { userId: string; projectId: string; startedAt: string; ok: boolean }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const db = admin();
    const { data: p } = await db.from("profiles").select("email_build_done").eq("id", o.userId).single();
    if (!buildEmailDue(o.startedAt, new Date(), !!p?.email_build_done)) return;
    const [{ data: proj }, to] = await Promise.all([
      db.from("projects").select("name").eq("id", o.projectId).single(), emailOf(o.userId),
    ]);
    if (!to || !proj) return;
    const mail = layoutEmail({
      heading: o.ok ? `${proj.name} is ready` : `${proj.name}: the build stopped`,
      body: o.ok ? "Oriel finished your request. Open the workspace to review the preview and publish when you're happy with it."
        : "Oriel could not finish your request. Changes made so far are saved. Open the workspace to see what happened and send your message again.",
      cta: "Open workspace", href: `${APP_URL}/workspace/${o.projectId}`, footer: PREFS_FOOTER,
    });
    await sendEmail({ to, subject: o.ok ? `${proj.name} is ready` : `${proj.name}: the build stopped`, ...mail });
  } catch (e) {
    console.error("notifyBuildDone failed", e);
  }
}

/** After spending credits: warn once a week when the balance drops below 15% of the plan's monthly credits. */
export async function notifyLowCredits(userId: string, total: number) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const db = admin();
    const [{ data: p }, { data: tier }] = await Promise.all([
      db.from("profiles").select("email_low_credits, low_credits_emailed_at").eq("id", userId).single(),
      db.rpc("effective_tier", { p_user: userId }),
    ]);
    const { data: t } = await db.from("tiers").select("monthly_credits").eq("id", tier ?? "free").single();
    const now = new Date();
    if (!p || !t || !lowCreditsDue({ total, monthlyCredits: t.monthly_credits, optedIn: p.email_low_credits, lastEmailedAt: p.low_credits_emailed_at, now })) return;
    // claim the slot first so parallel charges send at most one email
    const { data: claimed } = await db.from("profiles").update({ low_credits_emailed_at: now.toISOString() }).eq("id", userId)
      .or(`low_credits_emailed_at.is.null,low_credits_emailed_at.lt.${new Date(now.getTime() - LOW_CREDITS_REPEAT_MS).toISOString()}`)
      .select("id");
    if (!claimed?.length) return;
    const to = await emailOf(userId);
    if (!to) return;
    const mail = layoutEmail({
      heading: "You're running low on credits",
      body: `You have ${Math.max(0, total).toLocaleString("en-US")} credits left. Top up or upgrade your plan so your next build doesn't stop halfway. Top-up credits never expire.`,
      cta: "See plans and top-ups", href: `${APP_URL}/tiers`, footer: PREFS_FOOTER,
    });
    await sendEmail({ to, subject: "You're running low on Oriel credits", ...mail });
  } catch (e) {
    console.error("notifyLowCredits failed", e);
  }
}
