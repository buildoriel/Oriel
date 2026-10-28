"use client";
import { PrivyProvider, useIdentityToken, useLogout, usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "./Icon";

export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

const robinhoodChain = {
  id: Number(process.env.NEXT_PUBLIC_RH_CHAIN_ID ?? 4663), name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RH_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: process.env.NEXT_PUBLIC_RH_EXPLORER_URL ?? "https://robinhoodchain.blockscout.com" } },
} as const;

const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

/** Privy context for the pages that sign people in or out. The rest of the app runs on the Supabase session. */
export function PrivyAuthProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(isDark()); }, []);
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={{
      loginMethods: ["wallet", "email", "google"],
      appearance: {
        theme: dark ? "dark" : "light", accentColor: "#FF7A3D", logo: dark ? "/oriel-lockup-dark.svg" : "/oriel-lockup-light.svg",
        landingHeader: "Sign in to Oriel", loginMessage: "Connect a wallet, or continue with email or Google.",
        showWalletLoginFirst: true, walletChainType: "ethereum-only",
      },
      embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
      defaultChain: robinhoodChain, supportedChains: [robinhoodChain],
      legal: { termsAndConditionsUrl: "/terms", privacyPolicyUrl: "/privacy" },
    }}>
      {children}
    </PrivyProvider>
  );
}

/** Opens Privy, then trades the Privy identity token for an Oriel (Supabase) session and continues to `next`. */
export function PrivyLogin({ next }: { next: string }) {
  const { ready, authenticated, login } = usePrivy();
  const { identityToken } = useIdentityToken();
  const [state, setState] = useState<"idle" | "linking" | "error">("idle");
  const [err, setErr] = useState("");
  const tried = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !identityToken || tried.current === identityToken) return;
    tried.current = identityToken;
    setState("linking"); setErr("");
    fetch("/api/auth/privy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: identityToken }) })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Sign-in failed.");
        location.href = next;
      })
      .catch((e) => { setState("error"); setErr(e.message); });
  }, [ready, authenticated, identityToken, next]);

  const busy = !ready || state === "linking" || (authenticated && !identityToken && state !== "error");
  return (
    <div className="stack" style={{ gap: 12 }}>
      <button className="btn btn-primary btn-lg btn-block" type="button" disabled={busy} onClick={() => login()}>
        {busy ? <span className="spinner" /> : <Icon name="wallet" />}
        {state === "linking" ? "Signing you in…" : "Connect wallet or sign in"}
      </button>
      <p className="xs faint center">Wallet, email or Google. If you don&apos;t have a wallet, Oriel creates one for you.</p>
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  );
}

/** Ends both sessions (Privy and Oriel), then goes home. */
export function PrivyLogout() {
  const { ready } = usePrivy();
  const { logout } = useLogout();
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    (async () => {
      await logout().catch(() => {});
      await supabaseBrowser().auth.signOut().catch(() => {});
      location.href = "/";
    })();
  }, [ready, logout]);
  return <p className="small mute center"><span className="spinner" /> Signing out…</p>;
}
