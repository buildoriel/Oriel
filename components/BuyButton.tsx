"use client";
import { useRef, useState } from "react";
import { PAYMENTS, payToTreasury, verifyWallet } from "@/lib/wallet-client";
import { refreshShell } from "./AppShell";
import { Modal } from "./ui";

/**
 * Pay with USDG (1:1 to the dollar) or $ORIEL. For $ORIEL the token amount comes from /api/credits/quote
 * (lower of spot and 7-day TWAP + 3% headroom; any excess comes back as credits).
 */
export function BuyButton({ product, usd, label, primary }: { product: string; usd: number; label: string; primary?: boolean }) {
  const [state, setState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<string | null>(null);
  const answer = useRef<((ok: boolean) => void) | null>(null);

  // Resolves once the user confirms or dismisses the $ORIEL quote dialog
  const ask = (amount: string) => new Promise<boolean>((res) => { answer.current = res; setQuote(amount); });
  const reply = (ok: boolean) => { answer.current?.(ok); answer.current = null; setQuote(null); };

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
        setState(null);
        if (!(await ask(amount))) return;
      }
      setState("Confirm in your wallet");
      const txHash = await payToTreasury(token, amount);
      setState("Verifying");
      const r = await fetch("/api/credits/purchase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash, token, product }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setState(j.message ?? `+${j.credits.toLocaleString("en-US")} credits`);
      refreshShell();
    } catch (e: any) { setState(e.shortMessage ?? e.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  if (!PAYMENTS.USDG && !PAYMENTS.ORIEL) return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <button type="button" className={`btn btn-block${primary ? " btn-primary" : ""}`} disabled>{label}</button>
      <span className="xs mute center">Payments open soon.</span>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      {PAYMENTS.USDG && <button type="button" className={`btn btn-block${primary ? " btn-primary" : ""}`} onClick={() => buy("USDG")} disabled={busy}>
        {busy && <span className="spinner" aria-hidden />}{label}
      </button>}
      {PAYMENTS.ORIEL && <button type="button" className="btn-link btn-sm" onClick={() => buy("ORIEL")} disabled={busy}>Pay with $ORIEL</button>}
      {state && <span className="xs mute center" role="status" aria-live="polite">{state}</span>}
      <Modal open={quote !== null} onClose={() => reply(false)} title="Pay with $ORIEL"
        footer={<>
          <button type="button" className="btn" onClick={() => reply(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => reply(true)}>Continue</button>
        </>}>
        <p>You are about to send <b className="mono" style={{ color: "var(--ink)" }}>{Number(quote ?? 0).toLocaleString("en-US")} $ORIEL</b> (about ${usd}).</p>
        <p>Any excess is returned to you as credits.</p>
      </Modal>
    </div>
  );
}
