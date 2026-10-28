"use client";
import { useState } from "react";
import { connectAndSign, payToTreasury } from "@/lib/wallet-client";

/** Bayar USDG (harga dolar 1:1). Untuk $ORIEL, jumlah token dihitung server-side via harga min(spot, TWAP) — lihat README. */
export function BuyButton({ product, usd, label, ink }: { product: string; usd: number; label: string; ink?: boolean }) {
  const [state, setState] = useState<string | null>(null);
  async function buy() {
    try {
      setState("Cek wallet");
      const me = await fetch("/api/me").then((r) => r.json());
      if (!me.profile?.wallet_verified_at) {
        const { message } = await fetch("/api/wallet/nonce", { method: "POST" }).then((r) => r.json());
        const sig = await connectAndSign(message);
        const v = await fetch("/api/wallet/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sig) });
        if (!v.ok) throw new Error((await v.json()).error);
      }
      setState("Konfirmasi di wallet");
      const txHash = await payToTreasury("USDG", String(usd));
      setState("Memverifikasi");
      const r = await fetch("/api/credits/purchase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash, token: "USDG", product }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setState(`+${j.credits.toLocaleString("id-ID")} kredit`);
    } catch (e: any) { setState(e.shortMessage ?? e.message ?? "Gagal"); }
  }
  return (
    <span style={{ display: "grid", gap: 6 }}>
      <button className={`pill sm${ink ? " ink" : ""}`} onClick={buy} style={{ justifyContent: "center" }}>{label}</button>
      {state && <span className="mono mute" style={{ fontSize: 11 }}>{state}</span>}
    </span>
  );
}
