"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const EXPLORER = process.env.NEXT_PUBLIC_RH_EXPLORER_URL ?? "https://robinhoodchain.blockscout.com";
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Shared fetch: every TokenCA on the page asks once. */
let pending: Promise<string | null> | null = null;
const load = () => (pending ??= fetch("/api/token").then((r) => (r.ok ? r.json() : null)).then((j) => j?.address ?? null).catch(() => null));

/**
 * The official $ORIEL contract address with copy and explorer links. Renders nothing until the token exists
 * (detected on-chain from the dev wallet, see lib/official-token.ts).
 */
export function TokenCA({ variant = "pill" }: { variant?: "pill" | "footer" }) {
  const [addr, setAddr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { load().then(setAddr); }, []);
  if (!addr) return null;

  const copy = async () => {
    try { await navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };
  return (
    <div className={`token-ca token-ca-${variant}`}>
      <span className="token-ca-label"><span className="dot" />$ORIEL</span>
      <code className="token-ca-addr" title={addr}><span className="hide-mobile">{addr}</span><span className="only-mobile">{short(addr)}</span></code>
      <button type="button" className="token-ca-btn" onClick={copy} aria-label="Copy the $ORIEL contract address">
        <Icon name={copied ? "check" : "copy"} size={14} />{copied ? "Copied" : "Copy"}
      </button>
      <a className="token-ca-btn" href={`${EXPLORER}/token/${addr}`} target="_blank" rel="noreferrer" aria-label="View $ORIEL on the explorer">
        <Icon name="external" size={14} />
      </a>
    </div>
  );
}
