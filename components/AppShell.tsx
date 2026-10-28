"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { OrielLockup } from "./Logo";

type Me = { email: string; tier: string; balance: { total: number; monthly: number; topup: number }; profile: { handle: string | null }; notifications: unknown[] };
type Project = { id: string; name: string; slug: string; published_version: number | null };

const NAV: [string, string, IconName][] = [
  ["/templates", "Templates", "templates"],
  ["/connectors", "Connectors & domains", "plug"],
  ["/stake", "Stake", "layers"],
  ["/tiers", "Plans & credits", "card"],
];
const TIER_CREDITS: Record<string, number> = { free: 60, builder: 1000, pro: 2500, studio: 10000 };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Ask the shell to reload credits and recent projects (after a build, purchase, or new project). */
export const refreshShell = () => window.dispatchEvent(new Event("oriel:refresh"));

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/me").catch(() => null);
    if (!r?.ok) { setMe(null); return; }
    setMe(await r.json());
    const p = await fetch("/api/projects").then((x) => (x.ok ? x.json() : { projects: [] })).catch(() => ({ projects: [] }));
    setProjects(p.projects ?? []);
  }, []);
  useEffect(() => { load(); }, [load, path]);
  useEffect(() => { const f = () => load(); window.addEventListener("oriel:refresh", f); return () => window.removeEventListener("oriel:refresh", f); }, [load]);
  useEffect(() => { setOpen(false); }, [path]);

  const unread = me?.notifications?.length ?? 0;
  const total = me?.balance.total ?? 0;
  const quota = TIER_CREDITS[me?.tier ?? "free"] ?? 60;

  return (
    <div className="shell" data-open={open}>
      <aside className="sidebar" aria-label="Sidebar">
        <div className="sb-top">
          <Link href="/workspace" className="sb-logo" aria-label="Oriel workspace"><OrielLockup height={24} /></Link>
          <button className="btn btn-ghost btn-icon btn-sm only-mobile" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="x" /></button>
        </div>
        <div className="sb-section">
          <Link href="/workspace" className="btn btn-primary sb-new"><Icon name="plus" />New project</Link>
        </div>
        <nav className="sb-section sb-nav" aria-label="App">
          {NAV.map(([h, l, i]) => (
            <Link key={h} href={h} className="sb-link" aria-current={path.startsWith(h) ? "page" : undefined}><Icon name={i} />{l}</Link>
          ))}
        </nav>

        <div className="sb-label">Recent</div>
        <div className="sb-recents">
          {me === null && <p className="small mute" style={{ padding: "4px 10px" }}>Sign in to see your projects.</p>}
          {me && projects.length === 0 && <p className="small mute" style={{ padding: "4px 10px" }}>No projects yet.</p>}
          {projects.slice(0, 30).map((p) => (
            <Link key={p.id} href={`/workspace/${p.id}`} className="sb-recent" aria-current={path === `/workspace/${p.id}` ? "page" : undefined} title={p.name}>{p.name}</Link>
          ))}
        </div>

        <div className="sb-foot">
          {me ? (
            <>
              <Link href="/tiers" className="sb-credits" aria-label={`${total} credits, ${me.tier} plan`}>
                <div className="row-between">
                  <span className="small"><b className="num">{total.toLocaleString("en-US")}</b> <span className="mute">credits</span></span>
                  <span className="badge">{cap(me.tier)}</span>
                </div>
                <div className="meter"><i className={total < quota * 0.15 ? "accent" : ""} style={{ width: `${Math.min(100, (total / quota) * 100)}%` }} /></div>
              </Link>
              <Link href="/account" className="sb-account" aria-current={path.startsWith("/account") ? "page" : undefined}>
                <span className="avatar">{(me.profile?.handle ?? me.email ?? "?").charAt(0)}</span>
                <span className="grow">
                  <span className="small truncate" style={{ display: "block" }}>{me.profile?.handle ? `@${me.profile.handle}` : me.email}</span>
                  <span className="xs mute">Account</span>
                </span>
                {unread > 0 && <span className="dot" aria-label={`${unread} unread notifications`} />}
              </Link>
            </>
          ) : me === null ? (
            <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn btn-primary btn-block">Sign in</Link>
          ) : (
            <div className="skel" style={{ height: 64 }} />
          )}
        </div>
      </aside>
      <div className="sb-scrim" onClick={() => setOpen(false)} />

      <div className="main">
        <div className="topbar">
          <button className="btn btn-ghost btn-icon" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <Link href="/workspace" className="logo" aria-label="Oriel workspace"><OrielLockup height={22} /></Link>
          {me ? <Link href="/tiers" className="badge num" aria-label={`${total} credits`}>{total.toLocaleString("en-US")} credits</Link>
            : <Link href="/workspace" className="btn btn-ghost btn-icon" aria-label="New project"><Icon name="plus" /></Link>}
        </div>
        {children}
      </div>
    </div>
  );
}
