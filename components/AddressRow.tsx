"use client";
import { useState } from "react";
import { Icon } from "./Icon";

const EXPLORER = process.env.NEXT_PUBLIC_RH_EXPLORER_URL ?? "https://robinhoodchain.blockscout.com";

/** A labelled contract address with copy and explorer buttons. */
export function AddressRow({ label, note, address, kind = "address", compact = false }: { label: string; note?: string; address: string; kind?: "address" | "token"; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };
  return (
    <div className={`addr-row${compact ? " addr-compact" : ""}`}>
      <div className="addr-meta">
        <span className="addr-label">{label}</span>
        {note && <span className="xs mute">{note}</span>}
      </div>
      <code className="addr-value">{address}</code>
      <div className="addr-actions">
        <button type="button" className="token-ca-btn" onClick={copy} aria-label={`Copy the ${label} address`}>
          <Icon name={copied ? "check" : "copy"} size={14} />{copied ? "Copied" : "Copy"}
        </button>
        <a className="token-ca-btn" href={`${EXPLORER}/${kind}/${address}`} target="_blank" rel="noreferrer" aria-label={`View ${label} on the explorer`}>
          <Icon name="external" size={14} />
        </a>
      </div>
    </div>
  );
}
