"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { OrielLockup } from "./Logo";

const LINKS = [
  ["/", "Home"], ["/workspace", "Workspace"], ["/tiers", "Tiers & Credits"], ["/stake", "Stake"], ["/templates", "Templates"], ["/connectors", "Connectors & Domains"],
] as const;
const MOB: [string, string, string][] = [
  ["/", "Home", "M4 11l8-6 8 6v8H4z"], ["/workspace", "Build", "M3 5h18v14H3zM10 5v14"], ["/tiers", "Tiers", "M5 18V12M12 18V8M19 18V5"],
  ["/stake", "Stake", "M5 7c0-1.7 3-3 7-3s7 1.3 7 3-3 3-7 3-7-1.3-7-3zM5 7v10c0 1.7 3 3 7 3s7-1.3 7-3V7"],
  ["/templates", "Templates", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h16v7H4z"], ["/connectors", "Connectors", "M9 15l6-6M8 12l-2 2a3 3 0 004 4l2-2M16 12l2-2a3 3 0 00-4-4l-2 2"],
];

export function Nav() {
  const path = usePathname();
  const [credits, setCredits] = useState<number | null>(null);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    fetch("/api/me").then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j) { setCredits(j.balance.total); setUnread(j.notifications?.length ?? 0); } }).catch(() => {});
  }, [path]);
  const on = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <>
      <header className="top"><div className="bar">
        <Link href="/" aria-label="Oriel home"><OrielLockup /></Link>
        <nav className="tabs" aria-label="Pages">
          {LINKS.map(([h, l]) => <Link key={h} href={h} aria-current={on(h) ? "page" : undefined}>{l}</Link>)}
        </nav>
        {credits != null
          ? <Link className="credit acct-link" href="/account" aria-label={`Account, ${credits} credits${unread ? `, ${unread} new notifications` : ""}`}>
              <b>{credits.toLocaleString("en-US")}</b> credits{unread > 0 && <span className="dot" />}</Link>
          : <Link className="pill sm login-link" href="/login">Sign in</Link>}
        <Link className="pill ink sm" href="/workspace">Start building</Link>
      </div></header>
      <nav className="mobnav" aria-label="Pages">
        {MOB.map(([h, l, d]) => <Link key={h} href={h} aria-current={on(h) ? "page" : undefined}><svg viewBox="0 0 24 24"><path d={d} /></svg>{l}</Link>)}
      </nav>
    </>
  );
}
