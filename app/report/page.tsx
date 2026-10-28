"use client";
import { useEffect, useState } from "react";

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
    <section className="page" style={{ maxWidth: 620 }}>
      <h2>Report a site</h2>
      <p className="mute" style={{ marginTop: 12 }}>
        Sites built on Oriel must follow our <a href="/terms">Terms of Service</a>. If a site hosted on Oriel is harmful,
        tell us here. We review every report and take down sites that break the rules.
      </p>
      {sent ? (
        <div className="card" style={{ marginTop: 24 }} role="status">
          <h3>Thanks, we got it.</h3>
          <p className="mute" style={{ marginTop: 8, fontSize: 14 }}>Our team will review the site. If you left an email, we may contact you for details.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="card" style={{ marginTop: 24, display: "grid", gap: 14 }}>
          <label className="field">Site address<input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.buildoriel.com/page" inputMode="url" /></label>
          <label className="field">What's wrong<select value={category} onChange={(e) => setCategory(e.target.value)}>{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="field">Details (optional)<textarea rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What did you see? Which page?" /></label>
          <label className="field">Your email (optional)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <button className="pill ink" type="submit" disabled={busy} style={{ justifyContent: "center" }}>{busy ? "Sending" : "Send report"}</button>
          {err && <p className="err" role="alert">{err}</p>}
        </form>
      )}
    </section>
  );
}
