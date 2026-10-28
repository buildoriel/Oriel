"use client";
import { useState } from "react";
import { payToTreasury, verifyWallet } from "@/lib/wallet-client";

/**
 * Pay with USDG (1:1 to the dollar) or $ORIEL. For $ORIEL the token amount comes from /api/credits/quote
 * (lower of spot and 7-day TWAP + 3% headroom; any excess comes back as credits).
 */
export function BuyButton({ product, usd, label, ink }: { product: string; usd: number; label: string; ink?: boolean }) {
  const [state, setState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function buy(token: "USDG" | "ORIEL") {
    if (busy) return;
    setBusy(true);
    try {
      setState("Checking wallet");
      const me = await fetch("/api/me").then((r) => (r.ok ? r.json() : null));
      if (!me) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
      if (!me.profile?.wallet_verified_at) { setState("Sign in your wallet"); await verifyWallet(); }
      let amount = String(usd);
      if (token === "ORIEL") {
        const q = await fetch(`/api/credits/quote?product=${product}`); const j = await q.json();
        if (!q.ok) throw new Error(j.error);
        amount = j.amount;
        if (!confirm(`Send ${Number(amount).toLocaleString("en-US")} $ORIEL (about $${usd})? Any excess is returned as credits.`)) { setState(null); return; }
      }
      setState("Confirm in your wallet");
      const txHash = await payToTreasury(token, amount);
      setState("Verifying");
      const r = await fetch("/api/credits/purchase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash, token, product }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setState(j.message ?? `+${j.credits.toLocaleString("en-US")} credits`);
    } catch (e: any) { setState(e.shortMessage ?? e.message ?? "Failed"); }
    finally { setBusy(false); }
  }
  return (
    <span style={{ display: "grid", gap: 6 }}>
      <button className={`pill sm${ink ? " ink" : ""}`} onClick={() => buy("USDG")} disabled={busy} style={{ justifyContent: "center" }}>{label}</button>
      <button className="linkish mono" onClick={() => buy("ORIEL")} disabled={busy}>or pay with $ORIEL</button>
      {state && <span className="mono mute" style={{ fontSize: 11 }} role="status">{state}</span>}
    </span>
  );
}
