import type { AbuseCategory } from "../abuse";

/**
 * Pre-publish safety scan of a project's files. Pure and synchronous apart from the optional
 * Google Safe Browsing lookup, so it is cheap to run on every publish and easy to test.
 *
 *   block  -> publishing is refused with the findings shown to the owner
 *   review -> publishing goes ahead, and an automatic abuse report is filed for the moderators
 *
 * Rules are deliberately narrow: they target what phishing kits, wallet drainers, and miners need
 * (seed phrase fields, credential exfiltration, brand + login combos, miner scripts), not normal sites.
 */
export type Severity = "block" | "review";
export type Finding = { rule: string; severity: Severity; category: AbuseCategory; file: string; message: string };
export type ScanResult = { blocked: boolean; review: boolean; findings: Finding[] };
type File = { path: string; content: string };

const TEXT = /\.(html?|js|mjs|svg|json|css|txt|md|xml)$/i;
const SCRIPTABLE = /\.(html?|js|mjs|svg)$/i;

const SEED_FIELD = /(seed|recovery|secret|mnemonic|backup)[\s_-]*(phrase|words?|key)|private[\s_-]*key|\b(12|24)[\s_-]*word/i;
const SEED_TEXT = /\b(enter|import|verify|validate|restore|sync|confirm|type)\b[^.<]{0,60}\b(seed|recovery|secret|mnemonic)\s+(phrase|words)/i;
const MINER = /coinhive|coin-hive|cryptonight|crypto-loot|cryptoloot|webminer|deepminer|coinimp|minero\.cc|jsecoin|monerominer|webmine\.pro/i;
const DRAINER = [
  [/setApprovalForAll\s*\(/, "calls setApprovalForAll (hands over all NFTs of a collection)"],
  [/["']eth_sign["']/, "uses eth_sign (blind signing, a common drainer technique)"],
  [/signTypedData(_v[34])?\b[\s\S]{0,400}\b(Permit|permit2|PermitSingle|PermitBatch)\b/, "requests a Permit signature (token approval without a transaction)"],
  [/0x095ea7b3|\bincreaseAllowance\s*\(/, "builds raw token approval calls"],
  [/(0x)?f{64}\b|MaxUint256|2n?\s*\*\*\s*256n?/i, "requests an unlimited token approval"],
  [/\bdrainer\b|inferno\s*drainer|angel\s*drainer|pink\s*drainer/i, "contains drainer kit markers"],
] as const;
const OBFUSCATION = [
  [/eval\s*\(\s*(atob|unescape|decodeURIComponent)\s*\(/, "evaluates decoded code (eval(atob(...)))"],
  [/eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[rd]\s*\)/, "contains packed (p,a,c,k,e,d) code"],
  [/document\.write\s*\(\s*(unescape|atob)\s*\(/, "writes decoded markup into the page"],
  [/new\s+Function\s*\(\s*(atob|unescape)\s*\(/, "builds a function from decoded text"],
] as const;
const BRANDS = /\b(metamask|coinbase|binance|trust\s*wallet|phantom|ledger|trezor|exodus|kraken|opensea|uniswap|paypal|apple\s*id|icloud|microsoft|outlook|office\s*365|gmail|google\s*account|facebook|instagram|whatsapp|netflix|amazon|chase|bank\s*of\s*america|wells\s*fargo|dhl|fedex|usps|robinhood)\b/i;
const EXFIL = /api\.telegram\.org\/bot|discord(app)?\.com\/api\/webhooks|hooks\.slack\.com\/services/i;

const hostOf = (u: string) => { try { return new URL(u).hostname.toLowerCase(); } catch { return null; } };

export function scanFiles(files: File[], opts: { allowedHosts?: string[] } = {}): Finding[] {
  const findings: Finding[] = [];
  const add = (f: Finding) => { if (!findings.some((x) => x.rule === f.rule && x.file === f.file)) findings.push(f); };
  const allowed = new Set((opts.allowedHosts ?? []).map((h) => h.toLowerCase()));
  const textFiles = files.filter((f) => TEXT.test(f.path) && !f.content.startsWith("data:"));

  const hasPassword = textFiles.some((f) => /<input[^>]*type\s*=\s*["']?password/i.test(f.content));
  const hasSeedField = textFiles.some((f) => /<(input|textarea)\b[^>]*>/gi.test(f.content)
    && [...f.content.matchAll(/<(input|textarea)\b[^>]*>/gi)].some((m) => SEED_FIELD.test(m[0])));
  const exfilFile = textFiles.find((f) => EXFIL.test(f.content));

  for (const f of textFiles) {
    const c = f.content;
    const html = /\.html?$/i.test(f.path);

    // ---- seed phrases / private keys: no legitimate site asks for these ----
    if ([...c.matchAll(/<(input|textarea)\b[^>]*>/gi)].some((m) => SEED_FIELD.test(m[0])) || (html && SEED_TEXT.test(stripTags(c))))
      add({ rule: "seed_phrase", severity: "block", category: "phishing", file: f.path, message: "Asks visitors for a wallet seed phrase or private key." });

    if (MINER.test(c))
      add({ rule: "crypto_miner", severity: "block", category: "malware", file: f.path, message: "Loads a cryptocurrency miner script." });

    // ---- credentials sent to a third party (classic phishing kit) ----
    if (EXFIL.test(c))
      add({ rule: "exfiltration", severity: hasPassword || hasSeedField ? "block" : "review", category: "phishing", file: f.path,
        message: hasPassword || hasSeedField ? "Sends form data, including passwords, to a Telegram/Discord/Slack bot." : "Sends data to a Telegram/Discord/Slack bot." });
    if (html && hasPassword) {
      for (const m of c.matchAll(/<form\b[^>]*action\s*=\s*["'](https?:\/\/[^"']+)["']/gi)) {
        const h = hostOf(m[1]);
        if (h && !allowed.has(h) && !h.endsWith(".supabase.co"))
          add({ rule: "credential_form", severity: "review", category: "phishing", file: f.path, message: `Posts a password form to an outside site (${h}).` });
      }
    }

    // ---- brand impersonation: a big brand in the title or main heading plus a login or wallet form ----
    if (html && (hasPassword || hasSeedField)) {
      const heading = `${c.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""} ${c.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ""} ${c.match(/property=["']og:site_name["'][^>]*content=["']([^"']+)/i)?.[1] ?? ""}`;
      const brand = stripTags(heading).match(BRANDS)?.[0];
      if (brand) add({ rule: "impersonation", severity: "review", category: "impersonation", file: f.path, message: `Login or wallet form on a page titled with the brand "${brand}".` });
    }

    if (!SCRIPTABLE.test(f.path)) continue;
    const script = html || /\.svg$/i.test(f.path) ? scriptsOf(c) : c;

    // ---- wallet drainer patterns ----
    for (const [re, why] of DRAINER) if (re.test(script))
      add({ rule: "wallet_drainer", severity: "review", category: "malware", file: f.path, message: `Wallet code ${why}.` });

    // ---- obfuscated code ----
    for (const [re, why] of OBFUSCATION) if (re.test(script))
      add({ rule: "obfuscation", severity: "review", category: "malware", file: f.path, message: `Obfuscated script: ${why}.` });
    if (/[A-Za-z0-9+/=]{4000,}/.test(script) || (script.match(/\\x[0-9a-f]{2}/gi)?.length ?? 0) > 300)
      add({ rule: "obfuscation", severity: "review", category: "malware", file: f.path, message: "Obfuscated script: large encoded blob." });

    // ---- silent redirects and hidden frames to other sites ----
    const refresh = c.match(/<meta[^>]*http-equiv\s*=\s*["']?refresh[^>]*content\s*=\s*["'][^"']*url\s*=\s*(https?:\/\/[^"'\s>]+)/i)?.[1];
    const jsRedirect = script.match(/(?:window\.|document\.|top\.)?location(?:\.href)?\s*(?:=|\.replace\(|\.assign\()\s*["'](https?:\/\/[^"']+)/)?.[1];
    for (const target of [refresh, jsRedirect]) {
      const h = target && hostOf(target);
      if (h && !allowed.has(h))
        add({ rule: "external_redirect", severity: "review", category: "phishing", file: f.path, message: `Automatically redirects visitors to ${h}.` });
    }
    for (const m of c.matchAll(/<iframe\b[^>]*>/gi)) {
      const tag = m[0], src = tag.match(/src\s*=\s*["'](https?:\/\/[^"']+)/i)?.[1];
      const hidden = /(width|height)\s*=\s*["']?[01]["'\s>]|display\s*:\s*none|visibility\s*:\s*hidden/i.test(tag);
      if (src && hidden && !allowed.has(hostOf(src) ?? ""))
        add({ rule: "hidden_iframe", severity: "review", category: "malware", file: f.path, message: `Loads a hidden frame from ${hostOf(src)}.` });
    }
  }
  if (exfilFile && hasSeedField) add({ rule: "seed_phrase", severity: "block", category: "phishing", file: exfilFile.path, message: "Collects a seed phrase and sends it to a bot." });
  return findings;
}

/** Absolute URLs linked from the project, for reputation lookups. */
export function urlsOf(files: File[], limit = 500) {
  const out = new Set<string>();
  for (const f of files) {
    if (!TEXT.test(f.path) || f.content.startsWith("data:")) continue;
    for (const m of f.content.matchAll(/https?:\/\/[^\s"'<>()`]+/g)) { out.add(m[0].replace(/[.,;]+$/, "")); if (out.size >= limit) return [...out]; }
  }
  return [...out];
}

const THREAT_CATEGORY: Record<string, AbuseCategory> = {
  MALWARE: "malware", SOCIAL_ENGINEERING: "phishing", UNWANTED_SOFTWARE: "malware", POTENTIALLY_HARMFUL_APPLICATION: "malware",
};

/**
 * Google Safe Browsing (v4 Lookup API). Optional: runs only when GOOGLE_SAFE_BROWSING_KEY is set.
 * Fails open: if Google is unreachable, publishing is not blocked by this check.
 */
export async function safeBrowsing(urls: string[]): Promise<Finding[]> {
  const key = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!key || !urls.length) return [];
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        client: { clientId: "oriel", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: Object.keys(THREAT_CATEGORY), platformTypes: ["ANY_PLATFORM"], threatEntryTypes: ["URL"],
          threatEntries: urls.slice(0, 500).map((url) => ({ url })),
        },
      }),
    });
    if (!res.ok) { console.error("safe browsing", res.status); return []; }
    const j: any = await res.json();
    return (j.matches ?? []).map((m: any) => ({
      rule: "safe_browsing", severity: "block" as const, category: THREAT_CATEGORY[m.threatType] ?? "malware", file: "(links)",
      message: `Links to ${m.threat?.url}, which Google Safe Browsing lists as ${String(m.threatType).toLowerCase().replace(/_/g, " ")}.`,
    }));
  } catch (e) {
    console.error("safe browsing unavailable", e);
    return [];
  }
}

export async function scanProject(files: File[], opts: { allowedHosts?: string[] } = {}): Promise<ScanResult> {
  const findings = [...scanFiles(files, opts), ...(await safeBrowsing(urlsOf(files)))];
  return { blocked: findings.some((f) => f.severity === "block"), review: findings.some((f) => f.severity === "review"), findings };
}

function scriptsOf(html: string) {
  const inline = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const handlers = [...html.matchAll(/\son[a-z]+\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1]);
  return [...inline, ...handlers].join("\n");
}
const stripTags = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
