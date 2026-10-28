"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const CONS = [
  ["github", "Gh", "GitHub", "Save code to your own repo. Every push becomes a commit.", "Builder"],
  ["vercel", "Ve", "Vercel", "Deploy projects to your Vercel account.", "Pro"],
  ["netlify", "Ne", "Netlify", "Deploy projects to your Netlify account.", "Pro"],
  ["supabase", "Sb", "Supabase", "A database for forms, stores, and dashboards.", "Pro"],
  ["google_drive", "Gd", "Google Drive", "Save documents and decks to Drive (only files Oriel creates).", "Pro"],
  ["cloudflare", "Cf", "Cloudflare DNS", "Set up custom domain DNS automatically.", "Studio"],
];

export default function Connectors() {
  const [connected, setConnected] = useState<string[]>([]); const [domains, setDomains] = useState<any[]>([]); const [cname, setCname] = useState("sites.buildoriel.com");
  const [projects, setProjects] = useState<any[]>([]); const [host, setHost] = useState(""); const [pid, setPid] = useState(""); const [err, setErr] = useState("");
  const load = async () => {
    const { data } = await supabaseBrowser().from("my_connectors").select("provider"); setConnected((data ?? []).map((d: any) => d.provider));
    const d = await fetch("/api/domains").then((r) => r.json()); setDomains(d.domains ?? []); setCname(d.cname);
    const p = await fetch("/api/projects").then((r) => r.json()); setProjects(p.projects ?? []); setPid((x) => x || p.projects?.[0]?.id || "");
  };
  useEffect(() => { load(); }, []);
  async function disconnect(p: string) { await fetch(`/api/connectors/${p}`, { method: "DELETE" }); load(); }
  async function cloudflare() {
    const token = prompt("Paste a Cloudflare API token (Zone:DNS:Edit permission for your domain's zone only):"); if (!token) return;
    const r = await fetch("/api/connectors/cloudflare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    r.ok ? load() : setErr((await r.json()).error);
  }
  async function addDomain(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/domains", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: pid, hostname: host.trim().toLowerCase() }) });
    r.ok ? (setHost(""), load()) : setErr((await r.json()).error);
  }
  async function check(id: string) { await fetch(`/api/domains/${id}`, { method: "POST" }); load(); }
  async function remove(id: string) { if (confirm("Disconnect this domain from the project?")) { await fetch(`/api/domains/${id}`, { method: "DELETE" }); load(); } }

  return (
    <section className="page">
      <h2>Connectors &amp; Domains</h2>
      <p className="mute" style={{ marginTop: 12, maxWidth: "56ch" }}>Connect your accounts with the fewest permissions possible. Disconnect any time. Pushes and deploys always ask for confirmation.</p>
      {err && <p className="err" style={{ marginTop: 12 }}>{err}</p>}
      <div className="grid cons">{CONS.map(([id, lg, name, desc, tier]) => {
        const on = connected.includes(id);
        return (
          <div key={id} className="card con">
            <div className="hd"><span className="lg">{lg}</span><span className={`st${on ? " ok" : ""}`}>{on ? "Connected" : tier}</span></div>
            <h3>{name}</h3><p className="mute" style={{ fontSize: 14 }}>{desc}</p>
            {on ? <button className="pill sm" onClick={() => disconnect(id)}>Disconnect</button>
              : id === "cloudflare" ? <button className="pill sm ink" onClick={cloudflare}>Connect</button>
              : <a className="pill sm ink" href={`/api/connectors/${id}/start`}>Connect</a>}
          </div>);
      })}</div>
      <div className="dom">
        <div className="card">
          <h3>Connect a domain</h3>
          <p className="mute" style={{ fontSize: 14, margin: "8px 0 16px" }}>Available on Pro and Studio. Add this record at your domain provider, then press Check.</p>
          <form onSubmit={addDomain} style={{ display: "grid", gap: 12 }}>
            <label className="field">Project<select value={pid} onChange={(e) => setPid(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <div className="inp"><input style={{ fontSize: 18 }} placeholder="www.yourdomain.com" value={host} onChange={(e) => setHost(e.target.value)} aria-label="Domain" /><button className="pill sm ink">Add</button></div>
          </form>
          <div className="dns" style={{ marginTop: 16 }}><span className="mute">Type</span><span>CNAME</span><span className="mute">Name</span><span>www (or a subdomain of your choice)</span><span className="mute">Value</span><span>{cname}</span></div>
        </div>
        <div className="card">
          <h3>Your domains</h3>
          {domains.length === 0 && <p className="mute" style={{ fontSize: 14, marginTop: 8 }}>No domains connected yet.</p>}
          <div className="list" style={{ marginTop: 12 }}>{domains.map((d) => (
            <div key={d.id} className="row-item" style={{ flexWrap: "wrap" }}>
              <span><b>{d.hostname}</b><br /><span className="mono mute">{({ pending: "Waiting for DNS", dns_ok: "Issuing HTTPS", active: "Active", failed: "Failed" } as any)[d.status]}</span>
                {d.last_error && <><br /><span className="err" style={{ fontSize: 12 }}>{d.last_error}</span></>}</span>
              <span style={{ display: "flex", gap: 6 }}><button className="pill sm" onClick={() => check(d.id)}>Check</button><button className="pill sm" onClick={() => remove(d.id)}>Remove</button></span>
            </div>))}</div>
        </div>
      </div>
    </section>
  );
}
