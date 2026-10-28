"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { OrielMark } from "@/components/Logo";
import { GoogleButton } from "@/components/GoogleButton";
import { safeNext } from "@/lib/redirect";

// shown once the Google provider is enabled in Supabase (Authentication > Providers)
const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "on";
export default function Login() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState("/workspace");
  useEffect(() => { setNext(safeNext(new URLSearchParams(location.search).get("next"))); }, []);
  async function send(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    setBusy(false);
    error ? setErr(error.message) : setSent(true);
  }
  return (
    <div className="site-main" style={{ display: "grid", placeItems: "center", minHeight: "calc(100dvh - 64px - 96px)", padding: "48px 16px" }}>
      <div className="card card-lg" style={{ width: "100%", maxWidth: 420 }}>
        <div className="stack center" style={{ justifyItems: "center", gap: 12, marginBottom: 24 }}>
          <OrielMark size={36} />
          <h1 className="h2">Sign in to Oriel</h1>
          <p className="small mute">Build anything. Own a piece of it.</p>
        </div>
        {sent ? (
          <div className="callout callout-ok" role="status">
            <Icon name="check" />
            <div className="callout-body">We sent a sign-in link to <b>{email}</b>. Open it on this device to continue.</div>
          </div>
        ) : (
          <form onSubmit={send} className="stack" style={{ gap: 14 }}>
            <label className="field">
              <span className="label">Email</span>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
            </label>
            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : null}Email me a sign-in link</button>
            {GOOGLE && <>
              <div className="row xs faint" style={{ gap: 12 }}>
                <span className="grow" style={{ borderTop: "1px solid var(--line)" }} />or<span className="grow" style={{ borderTop: "1px solid var(--line)" }} />
              </div>
              <GoogleButton next={next} onError={setErr} />
            </>}
            {err && <p className="err" role="alert">{err}</p>}
          </form>
        )}
        <p className="xs faint center" style={{ marginTop: 20 }}>
          By continuing you agree to the <a className="link" href="/terms">Terms</a> and <a className="link" href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
