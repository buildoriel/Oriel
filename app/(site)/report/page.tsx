"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

const REASONS: [string, string][] = [
  ["phishing", "Phishing or stealing passwords"], ["scam", "Scam or fraud"], ["malware", "Malware or wallet drainer"],
  ["impersonation", "Impersonating a person or brand"], ["illegal", "Illegal content"], ["spam", "Spam"], ["other", "Something else"],
];

export default function Report() {
  const [url, setUrl] = useState(""); const [category, setCategory] = useState("phishing");
  const [details, setDetails] = useState(""); const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { const u = new URLSearchParams(location.search).get("url"); if (u) setUrl(u); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, category, details, email }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    r.ok ? setSent(true) : setErr(j.error ?? "Something went wrong. Try again.");
  }

  return (
    <div className="site-main">
      <div className="page page-narrow" style={{ maxWidth: 640 }}>
        <div className="page-head" style={{ display: "block" }}>
          <span className="eyebrow">Trust &amp; safety</span>
          <h1 className="h1" style={{ marginTop: 10 }}>Report a site</h1>
          <p className="mute">
            Sites built on Oriel must follow our <a className="link" href="/terms">Terms of Service</a>. If a site hosted on Oriel is harmful,
            tell us here. We review every report and take down sites that break the rules.
          </p>
        </div>
        {sent ? (
          <div className="card card-lg stack" role="status">
            <span className="badge badge-ok" style={{ justifySelf: "start" }}><Icon name="check" size={12} />Report received</span>
            <h2 className="h2">Thanks, we got it.</h2>
            <p className="small mute">Our team will review the site. If you left an email, we may contact you for details.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card card-lg stack" style={{ gap: 18 }}>
            <label className="field">
              <span className="label">Site address</span>
              <input className="input" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.buildoriel.com/page" inputMode="url" />
            </label>
            <label className="field">
              <span className="label">What&apos;s wrong</span>
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="field">
              <span className="label">Details <span className="faint">(optional)</span></span>
              <textarea className="textarea" rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What did you see? Which page?" />
            </label>
            <label className="field">
              <span className="label">Your email <span className="faint">(optional)</span></span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <span className="hint">Only used if we need more details about this report.</span>
            </label>
            {err && <div className="callout callout-bad" role="alert"><Icon name="alert" /><span className="callout-body">{err}</span></div>}
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : <Icon name="flag" />}{busy ? "Sending" : "Send report"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
