"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { OrielLockup } from "./Logo";

const LINKS: [string, string][] = [["/templates", "Templates"], ["/tiers", "Pricing"], ["/stake", "Stake"]];

/** Top navigation for public pages. Shows "Open workspace" once signed in. */
export function SiteNav() {
  const path = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => { fetch("/api/me").then((r) => setSignedIn(r.ok)).catch(() => setSignedIn(false)); }, []);
  return (
    <header className="site-nav">
      <div className="site-nav-in">
        <Link href="/" className="logo" aria-label="Oriel home"><OrielLockup height={26} /></Link>
        <nav className="site-links" aria-label="Main">
          {LINKS.map(([h, l]) => <Link key={h} href={h} aria-current={path === h ? "page" : undefined}>{l}</Link>)}
        </nav>
        <div className="row">
          {signedIn ? <Link className="btn btn-primary" href="/workspace">Open workspace</Link>
            : <>
                <Link className="btn btn-ghost hide-mobile" href="/login">Sign in</Link>
                <Link className="btn btn-primary" href="/login?next=/workspace">Start building</Link>
              </>}
        </div>
      </div>
    </header>
  );
}
