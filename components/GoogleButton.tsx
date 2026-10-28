"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "./Icon";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type Gsi = {
  accounts: { id: {
    initialize: (o: Record<string, unknown>) => void;
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  } };
};

const sha256 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

function loadGsi(): Promise<Gsi> {
  const w = window as unknown as { google?: Gsi };
  if (w.google?.accounts?.id) return Promise.resolve(w.google);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => (w.google?.accounts?.id ? resolve(w.google) : reject(new Error("Google sign-in did not load")));
    s.onerror = () => reject(new Error("Google sign-in did not load"));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error("Google sign-in timed out")), 6000);
  });
}

/**
 * "Sign in with Google" rendered by Google on our own domain, so the consent screen names buildoriel.com
 * instead of the Supabase project. The ID token is exchanged with Supabase (signInWithIdToken).
 * Falls back to the Supabase redirect flow if Google's script can't load.
 */
export function GoogleButton({ next, onError }: { next: string; onError: (msg: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"loading" | "gsi" | "fallback">(CLIENT_ID ? "loading" : "fallback");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let live = true;
    (async () => {
      try {
        const g = await loadGsi();
        const raw = crypto.randomUUID() + crypto.randomUUID();
        g.accounts.id.initialize({
          client_id: CLIENT_ID, nonce: await sha256(raw), ux_mode: "popup", itp_support: true, use_fedcm_for_button: true,
          callback: async ({ credential }: { credential: string }) => {
            setBusy(true);
            const { error } = await supabaseBrowser().auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
            if (error) { setBusy(false); onError(error.message); return; }
            await fetch("/api/auth/after-login", { method: "POST" }).catch(() => {});
            location.href = next;
          },
        });
        if (!live || !box.current) return;
        const dark = document.documentElement.dataset.theme === "dark"
          || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
        g.accounts.id.renderButton(box.current, {
          type: "standard", theme: dark ? "filled_black" : "outline", size: "large", text: "continue_with",
          shape: "rectangular", logo_alignment: "center", width: Math.min(400, box.current.offsetWidth || 360),
        });
        setMode("gsi");
      } catch { if (live) setMode("fallback"); }
    })();
    return () => { live = false; };
  }, [next, onError]);

  async function redirectFlow() {
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google", options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setBusy(false); onError(error.message); }
  }

  if (mode === "fallback") {
    return <button className="btn btn-lg btn-block" type="button" onClick={redirectFlow} disabled={busy}>
      {busy ? <span className="spinner" /> : <Icon name="globe" />}Continue with Google
    </button>;
  }
  return (
    <div style={{ minHeight: 44, display: "grid", placeItems: "center", position: "relative" }}>
      <div ref={box} style={{ width: "100%", display: "flex", justifyContent: "center", opacity: busy ? 0.4 : 1 }} />
      {(mode === "loading" || busy) && <span className="spinner" style={{ position: "absolute" }} aria-label="Loading" />}
    </div>
  );
}
