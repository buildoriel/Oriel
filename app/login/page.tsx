"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [err, setErr] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const next = new URLSearchParams(location.search).get("next") ?? "/workspace";
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    error ? setErr(error.message) : setSent(true);
  }
  async function google() {
    await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
  }
  return (
    <section className="page" style={{ maxWidth: 460 }}>
      <h2>Masuk ke Oriel</h2>
      {sent ? <p className="mute" style={{ marginTop: 16 }}>Link masuk sudah dikirim ke {email}. Buka email itu di perangkat ini.</p> : (
        <form onSubmit={send} className="card" style={{ marginTop: 24, display: "grid", gap: 14 }}>
          <label className="field">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <button className="pill ink" type="submit" style={{ justifyContent: "center" }}>Kirim link masuk</button>
          <button className="pill" type="button" onClick={google} style={{ justifyContent: "center" }}>Masuk dengan Google</button>
          {err && <p className="err">{err}</p>}
        </form>)}
    </section>
  );
}
