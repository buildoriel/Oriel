"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Composer, EstimateLabel, useEstimate } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";

type Project = { id: string; name: string; slug: string; published_version: number | null; updated_at: string };
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com";

const IDEAS: [IconName, string, string][] = [
  ["globe", "Landing page", "A landing page for a specialty coffee roaster: story, single-origin menu, wholesale form."],
  ["pen", "Portfolio", "A portfolio for an architecture photographer with a full-screen gallery and project pages."],
  ["store", "Online store", "A small online store for handmade ceramics with product pages and a cart."],
  ["chart", "Dashboard", "A personal finance dashboard with monthly spending charts and a budget table."],
  ["deck", "Pitch deck", "A 10-slide pitch deck for a climate fintech startup, clean and minimal."],
  ["palette", "Logo", "Three SVG logo options for a cycling club called North Loop."],
];

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Working late?" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function Start() {
  const [prompt, setPrompt] = useState("");
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [err, setErr] = useState("");
  const [hello, setHello] = useState("What should we build?");
  const est = useEstimate(prompt);

  useEffect(() => {
    setHello(greeting());
    fetch("/api/projects").then((r) => (r.ok ? r.json() : { projects: [] })).then((j) => setProjects(j.projects ?? [])).catch(() => setProjects([]));
    const e = new URLSearchParams(location.search).get("error"); if (e) setErr(e);
  }, []);

  // /workspace/new creates the project (auto subdomain) and opens it with the prompt sent
  const start = () => { location.href = `/workspace/new?prompt=${encodeURIComponent(prompt.trim())}`; };

  return (
    <div className="page" style={{ maxWidth: 820, paddingTop: "max(8vh, 40px)" }}>
      <div className="center stack" style={{ gap: 10, marginBottom: 28 }}>
        <h1 className="display" style={{ fontSize: "clamp(36px, 5vw, 52px)" }}>{hello}</h1>
        <p className="lead">Describe what you want. Oriel builds it, puts it live, and keeps improving it with you.</p>
      </div>

      <Composer value={prompt} onChange={setPrompt} onSubmit={start} autoFocus
        placeholder="A website for my ceramics studio, warm and minimal, with a gallery and a contact form"
        footer={est ? <EstimateLabel est={est} /> : <><Icon name="spark" size={14} /><span>Oriel picks the right model for each request</span></>} />
      {err && <div className="callout callout-bad" style={{ marginTop: 12 }}><Icon name="alert" /><span className="callout-body">{err}</span></div>}

      <div className="row wrap" style={{ justifyContent: "center", marginTop: 18, gap: 8 }}>
        {IDEAS.map(([icon, label, text]) => (
          <button key={label} type="button" className="chip" onClick={() => setPrompt(text)}><Icon name={icon} />{label}</button>
        ))}
      </div>

      <section style={{ marginTop: 64 }}>
        <div className="row-between" style={{ marginBottom: 14 }}>
          <h2 className="h3">Recent projects</h2>
          {projects && projects.length > 0 && <span className="small mute">{projects.length} project{projects.length === 1 ? "" : "s"}</span>}
        </div>
        {projects === null ? (
          <div className="grid-2">{[0, 1].map((i) => <div key={i} className="skel" style={{ height: 76 }} />)}</div>
        ) : projects.length === 0 ? (
          <div className="empty"><Icon name="folder" /><span>Your projects will appear here.</span></div>
        ) : (
          <div className="grid-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/workspace/${p.id}`} className="card card-hover row" style={{ padding: 16, gap: 14 }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", flex: "none" }}>
                  <Icon name={p.published_version ? "globe" : "file"} size={18} />
                </span>
                <span className="grow">
                  <span className="truncate" style={{ display: "block", fontWeight: 500 }}>{p.name}</span>
                  <span className="xs mute truncate" style={{ display: "block" }}>{p.slug}.{ROOT} · {ago(p.updated_at)}</span>
                </span>
                {p.published_version ? <span className="badge badge-ok"><span className="dot dot-ok" />Live</span> : <span className="badge">Draft</span>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
