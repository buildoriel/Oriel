"use client";
import { useState } from "react";
import { payToTreasury, verifyWallet } from "@/lib/wallet-client";

/**
 * Bayar dengan USDG (1:1 dolar) atau $ORIEL. Untuk $ORIEL jumlah token diambil dari /api/credits/quote
 * (harga terendah antara spot dan TWAP 7 hari + ruang gerak 3%; kelebihan kembali sebagai kredit).
 */
export function BuyButton({ product, usd, label, ink }: { product: string; usd: number; label: string; ink?: boolean }) {
  const [state, setState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function buy(token: "USDG" | "ORIEL") {
    if (busy) return;
    setBusy(true);
    try {
      setState("Cek wallet");
      const me = await fetch("/api/me").then((r) => (r.ok ? r.json() : null));
      if (!me) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
      if (!me.profile?.wallet_verified_at) { setState("Tanda tangani di wallet"); await verifyWallet(); }
      let amount = String(usd);
      if (token === "ORIEL") {
        const q = await fetch(`/api/credits/quote?product=${product}`); const j = await q.json();
        if (!q.ok) throw new Error(j.error);
        amount = j.amount;
        if (!confirm(`Kirim ${Number(amount).toLocaleString("id-ID")} $ORIEL (sekitar $${usd})? Kelebihan dikembalikan sebagai kredit.`)) { setState(null); return; }
      }
      setState("Konfirmasi di wallet");
      const txHash = await payToTreasury(token, amount);
      setState("Memverifikasi");
      const r = await fetch("/api/credits/purchase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash, token, product }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setState(j.message ?? `+${j.credits.toLocaleString("id-ID")} kredit`);
    } catch (e: any) { setState(e.shortMessage ?? e.message ?? "Gagal"); }
    finally { setBusy(false); }
  }
  return (
    <span style={{ display: "grid", gap: 6 }}>
      <button className={`pill sm${ink ? " ink" : ""}`} onClick={() => buy("USDG")} disabled={busy} style={{ justifyContent: "center" }}>{label}</button>
      <button className="linkish mono" onClick={() => buy("ORIEL")} disabled={busy}>atau bayar dengan $ORIEL</button>
      {state && <span className="mono mute" style={{ fontSize: 11 }} role="status">{state}</span>}
    </span>
  );
}
