// Email rules and error-report cleaning, no network: npx tsx scripts/email.test.ts
import assert from "node:assert";
import { buildEmailDue, layoutEmail, lowCreditsDue, sendEmail } from "../lib/email";
import { cleanReport } from "../lib/monitoring";

async function main() {
  const now = new Date("2026-10-28T12:00:00Z");

  // ---- build finished: only for opted-in users and builds of a minute or more ----
  assert.equal(buildEmailDue("2026-10-28T11:58:00Z", now, true), true);
  assert.equal(buildEmailDue("2026-10-28T11:59:30Z", now, true), false, "watched in the tab");
  assert.equal(buildEmailDue("2026-10-28T11:00:00Z", now, false), false, "opted out");

  // ---- low credits: below 15% of the plan's monthly credits, at most once a week ----
  const base = { total: 100, monthlyCredits: 1000, optedIn: true, lastEmailedAt: null as string | null, now };
  assert.equal(lowCreditsDue(base), true);
  assert.equal(lowCreditsDue({ ...base, total: 150 }), false, "exactly 15% is not low");
  assert.equal(lowCreditsDue({ ...base, total: 149 }), true);
  assert.equal(lowCreditsDue({ ...base, optedIn: false }), false);
  assert.equal(lowCreditsDue({ ...base, lastEmailedAt: "2026-10-25T12:00:00Z" }), false, "emailed 3 days ago");
  assert.equal(lowCreditsDue({ ...base, lastEmailedAt: "2026-10-20T12:00:00Z" }), true, "emailed 8 days ago");
  assert.equal(lowCreditsDue({ ...base, monthlyCredits: 0 }), false);
  assert.equal(lowCreditsDue({ ...base, monthlyCredits: 60, total: 8 }), true, "free plan: 8 < 9");
  assert.equal(lowCreditsDue({ ...base, total: -5 }), true);

  // ---- templates escape user content ----
  const m = layoutEmail({ heading: `<script>x</script> & "Clay"`, body: "b", cta: "Open", href: "https://buildoriel.com/workspace/1", footer: "f" });
  assert.ok(!m.html.includes("<script>x"), "heading is escaped");
  assert.ok(m.html.includes("&lt;script&gt;x&lt;/script&gt; &amp; &quot;Clay&quot;"));
  assert.ok(m.text.includes("Open: https://buildoriel.com/workspace/1"));

  // ---- without RESEND_API_KEY nothing is sent ----
  delete process.env.RESEND_API_KEY;
  assert.equal(await sendEmail({ to: "a@b.co", subject: "s", html: "h", text: "t" }), false);

  // ---- error reports are trimmed; empty messages are dropped ----
  assert.equal(cleanReport({ source: "client", message: "" }), null);
  assert.equal(cleanReport({ source: "client", message: 42 as unknown as string }), null);
  const r = cleanReport({ source: "server", message: "x".repeat(5000), stack: "s".repeat(20000), url: "/api/x" })!;
  assert.equal(r.message.length, 1000);
  assert.equal(r.stack!.length, 8000);
  assert.equal(r.user_id, null);

  console.log("email + monitoring tests passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
