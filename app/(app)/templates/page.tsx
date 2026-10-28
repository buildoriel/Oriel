"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/ui";
import s from "./templates.module.css";

const CATS = [["", "All"], ["landing", "Landing page"], ["store", "Store"], ["portfolio", "Portfolio"], ["blog", "Blog"], ["dashboard", "Dashboard"], ["deck", "Deck"], ["community", "Community"], ["business", "Business"]];
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com";
const slugFor = (title: string) =>
  `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "project"}-${Math.random().toString(16).slice(2, 6)}`;

export default function Templates() {
  const [cat, setCat] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<any>(null);
  const [slug, setSlug] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setItems(null);
    fetch(`/api/templates${cat ? `?category=${cat}` : ""}`).then((r) => r.json()).then((j) => setItems(j.templates ?? [])).catch(() => setItems([]));
  }, [cat]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((t) => !q || String(t.title).toLowerCase().includes(q));
  }, [items, query]);

  function open(t: any) { setPicked(t); setSlug(slugFor(t.title)); setErr(""); }
  async function use() {
    if (!picked || !slug.trim()) return;
    setBusy(true); setErr("");
    const r = await fetch(`/api/templates/${picked.id}/use`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: slug.trim() }) });
    if (r.status === 401) { location.href = "/login?next=/templates"; return; }
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) router.push(`/workspace/${j.projectId}`); else setErr(j.error ?? "Could not create the project.");
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="h1">Templates</h1>
          <p className="mute">Start from someone else&apos;s work. Creators earn a USDG royalty every time their template is used.</p>
        </div>
        <Link className="btn" href="/workspace"><Icon name="tag" />Sell a template</Link>
      </div>

      <div className={s.toolbar}>
        <div className={s.chips} role="group" aria-label="Category">
          {CATS.map(([id, l]) => <button key={id} type="button" className="chip" aria-pressed={cat === id} onClick={() => setCat(id)}>{l}</button>)}
        </div>
        <div className={`input-group ${s.search} ${s.searchBox}`}>
          <Icon name="search" />
          <input className="input" type="search" placeholder="Search templates" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search templates" />
        </div>
      </div>

      {items === null ? (
        <div className={s.grid}>{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 300 }} />)}</div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <Icon name="templates" />
          <span>{query ? "No templates match your search." : "No templates in this category yet. Publish a project and sell it as the first one."}</span>
        </div>
      ) : (
        <div className={s.grid}>
          {shown.map((t) => (
            <article key={t.id} className={`card card-hover ${s.card}`}>
              <div className={s.thumb}>
                {t.source?.slug
                  ? <iframe src={`https://${t.source.slug}.${ROOT}`} title={t.title} loading="lazy" tabIndex={-1} aria-hidden="true" sandbox="allow-scripts" />
                  : <div className={s.placeholder}><Icon name="templates" /></div>}
              </div>
              <div className={s.body}>
                <h2 className="h3 truncate">{t.title}</h2>
                <p className={s.desc}>{t.description || "No description."}</p>
                <div className={s.meta}>
                  <span className="xs mute truncate">by @{t.profiles?.handle ?? "creator"} · {Number(t.uses ?? 0).toLocaleString("en-US")} uses</span>
                  {t.price_credits ? <span className="badge num">{Number(t.price_credits).toLocaleString("en-US")} credits</span> : <span className="badge badge-ok">Free</span>}
                </div>
                <div className={s.actions}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => open(t)}>Use template</button>
                  {t.source?.slug && <a className="btn btn-ghost btn-sm" href={`https://${t.source.slug}.${ROOT}`} target="_blank" rel="noreferrer"><Icon name="external" />View demo</a>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={!!picked} onClose={() => setPicked(null)} title={picked ? `Use “${picked.title}”` : ""}
        footer={<>
          <button className="btn" onClick={() => setPicked(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={use} disabled={busy || !slug.trim()}>{busy ? <span className="spinner" /> : null}Create project</button>
        </>}>
        <p>{picked?.price_credits ? `This template costs ${Number(picked.price_credits).toLocaleString("en-US")} credits.` : "This template is free."} Choose an address for your new project.</p>
        <label className="field">
          <span className="label">Address</span>
          <div className="input-group">
            <input className="input" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} aria-label="Subdomain" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") use(); }} />
            <span className="addon">.{ROOT}</span>
          </div>
          <span className="hint">Lowercase letters, numbers, and hyphens.</span>
        </label>
        {err && <p className="err" role="alert">{err}</p>}
      </Modal>
    </div>
  );
}
