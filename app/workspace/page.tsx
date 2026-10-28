"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]); const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [err, setErr] = useState("");
  const router = useRouter();
  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((j) => setProjects(j.projects ?? []));
    const e = new URLSearchParams(location.search).get("error"); if (e) setErr(e);
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, slug }) });
    const j = await r.json(); r.ok ? router.push(`/workspace/${j.id}`) : setErr(j.error);
  }
  return (
    <section className="page">
      <h2>Proyekmu</h2>
      <form onSubmit={create} className="card" style={{ marginTop: 24, display: "grid", gap: 14, maxWidth: 560 }}>
        <label className="field">Nama proyek<input required value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)); }} /></label>
        <label className="field">Alamat<div style={{ display: "flex", alignItems: "center", gap: 6 }}><input required value={slug} onChange={(e) => setSlug(e.target.value)} style={{ flex: 1, minWidth: 0 }} /><span className="mono">.buildoriel.com</span></div></label>
        <button className="pill ink" style={{ justifyContent: "center" }}>Buat proyek</button>
        {err && <p className="err">{err}</p>}
      </form>
      <div className="list" style={{ marginTop: 24 }}>
        {projects.map((p) => <Link key={p.id} href={`/workspace/${p.id}`} className="row-item"><span><b>{p.name}</b><br /><span className="mono mute">{p.slug}.buildoriel.com</span></span><span className="mono mute">{p.published_version ? `v${p.published_version} live` : "draf"}</span></Link>)}
      </div>
    </section>
  );
}
