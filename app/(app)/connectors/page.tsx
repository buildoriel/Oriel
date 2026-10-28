"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon, type IconName } from "@/components/Icon";
import { Modal } from "@/components/ui";
import s from "./connectors.module.css";

const CONS: [string, IconName, string, string, string][] = [
  ["github", "github", "GitHub", "Save code to your own repository. Every push becomes a commit.", "Builder"],
  ["vercel", "rocket", "Vercel", "Deploy projects to your own Vercel account.", "Pro"],
  ["netlify", "rocket", "Netlify", "Deploy projects to your own Netlify account.", "Pro"],
  ["supabase", "database", "Supabase", "A database for forms, stores, and dashboards.", "Pro"],
  ["google_drive", "cloud", "Google Drive", "Save documents and decks to Drive. Oriel only sees files it creates.", "Pro"],
  ["cloudflare", "globe", "Cloudflare DNS", "Set up DNS for custom domains automatically.", "Studio"],
];
const STATUS: Record<string, [string, string]> = {
  pending: ["Waiting for DNS", "badge-warn"], dns_ok: ["Issuing HTTPS", ""], active: ["Active", "badge-ok"], failed: ["Failed", "badge-bad"],
};

export default function Connectors() {
  const [connected, setConnected] = useState<string[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [cname, setCname] = useState("sites.buildoriel.com");
  const [projects, setProjects] = useState<any[]>([]);
  const [host, setHost] = useState(""); const [pid, setPid] = useState(""); const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [cfOpen, setCfOpen] = useState(false); const [cfToken, setCfToken] = useState(""); const [cfErr, setCfErr] = useState("");
  const [removing, setRemoving] = useState<any>(null);
  const [checking, setChecking] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabaseBrowser().from("my_connectors").select("provider"); setConnected((data ?? []).map((d: any) => d.provider));
    const d = await fetch("/api/domains").then((r) => r.json()).catch(() => ({})); setDomains(d.domains ?? []); if (d.cname) setCname(d.cname);
    const p = await fetch("/api/projects").then((r) => r.json()).catch(() => ({})); setProjects(p.projects ?? []); setPid((x) => x || p.projects?.[0]?.id || "");
    setLoaded(true);
  };
  useEffect(() => { load(); }, []);

  async function disconnect() {
    const p = disconnecting; setDisconnecting(null); if (!p) return;
    await fetch(`/api/connectors/${p}`, { method: "DELETE" }); load();
  }
  async function saveCloudflare() {
    if (!cfToken.trim()) return; setCfErr("");
    const r = await fetch("/api/connectors/cloudflare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: cfToken.trim() }) });
    if (r.ok) { setCfOpen(false); setCfToken(""); load(); } else setCfErr((await r.json().catch(() => ({}))).error ?? "Could not connect Cloudflare.");
  }
  async function addDomain(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/domains", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: pid, hostname: host.trim().toLowerCase() }) });
    r.ok ? (setHost(""), load()) : setErr((await r.json().catch(() => ({}))).error ?? "Could not add the domain.");
  }
  async function check(id: string) { setChecking(id); await fetch(`/api/domains/${id}`, { method: "POST" }); await load(); setChecking(null); }
  async function remove() {
    const d = removing; setRemoving(null); if (!d) return;
    await fetch(`/api/domains/${d.id}`, { method: "DELETE" }); load();
  }

  const name = (id: string | null) => CONS.find((c) => c[0] === id)?.[2] ?? id;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="h1">Connectors &amp; domains</h1>
          <p className="mute">Connect your accounts with the fewest permissions possible. Disconnect any time. Pushes and deploys always ask for confirmation.</p>
        </div>
      </div>

      <div className={s.grid}>
        {CONS.map(([id, icon, label, desc, tier]) => {
          const on = connected.includes(id);
          return (
            <div key={id} className={`card ${s.con}`}>
              <div className="row-between">
                <span className={s.tile}><Icon name={icon} /></span>
                {on ? <span className="badge badge-ok"><span className="dot dot-ok" />Connected</span> : <span className="badge badge-outline">{tier} plan</span>}
              </div>
              <h2 className="h3">{label}</h2>
              <p className={s.desc}>{desc}</p>
              <div className="row">
                {on ? <button type="button" className="btn btn-sm" onClick={() => setDisconnecting(id)}>Disconnect</button>
                  : id === "cloudflare" ? <button type="button" className="btn btn-primary btn-sm" onClick={() => { setCfErr(""); setCfOpen(true); }}>Connect</button>
                  : <a className="btn btn-primary btn-sm" href={`/api/connectors/${id}/start`}>Connect</a>}
              </div>
            </div>
          );
        })}
      </div>

      <section className={s.section}>
        <div className="page-head" style={{ marginBottom: 18 }}>
          <div>
            <h2 className="h2">Custom domains</h2>
            <p className="mute">Available on Pro and Studio. Add the DNS record at your domain provider, then press Check. HTTPS is set up automatically.</p>
          </div>
        </div>
        <div className={s.domains}>
          <div className="card">
            <h3 className="h3" style={{ marginBottom: 14 }}>Connect a domain</h3>
            <form onSubmit={addDomain} className="stack">
              <label className="field">
                <span className="label">Project</span>
                <select className="select" value={pid} onChange={(e) => setPid(e.target.value)} disabled={!projects.length}>
                  {projects.length === 0 && <option value="">No projects yet</option>}
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="label">Domain</span>
                <div className={s.addRow}>
                  <input className="input" placeholder="www.yourdomain.com" value={host} onChange={(e) => setHost(e.target.value)} aria-label="Domain" inputMode="url" autoCapitalize="none" />
                  <button type="submit" className="btn btn-primary" disabled={!host.trim() || !pid}><Icon name="plus" />Add</button>
                </div>
              </label>
              {err && <p className="err" role="alert">{err}</p>}
            </form>
            <div className={`panel ${s.dns}`}>
              <p className="xs mute" style={{ marginBottom: 8 }}>DNS record to add</p>
              <table className="table">
                <tbody>
                  <tr><td>Type</td><td>CNAME</td></tr>
                  <tr><td>Name</td><td>www (or a subdomain of your choice)</td></tr>
                  <tr><td>Value</td><td>{cname}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="h3" style={{ marginBottom: 4 }}>Your domains</h3>
            {!loaded ? <div className="skel" style={{ height: 60, marginTop: 12 }} />
              : domains.length === 0 ? (
                <div className="empty" style={{ marginTop: 12, padding: "32px 16px" }}><Icon name="globe" /><span>No domains connected yet.</span></div>
              ) : domains.map((d) => {
                const [label, cls] = STATUS[d.status] ?? [d.status, ""];
                return (
                  <div key={d.id} className={s.domain}>
                    <div className="grow stack" style={{ gap: 4 }}>
                      <span className={s.host}>{d.hostname}</span>
                      <span><span className={`badge ${cls}`}>{label}</span></span>
                      {d.last_error && <span className="err xs">{d.last_error}</span>}
                    </div>
                    <div className="row">
                      <button type="button" className="btn btn-sm" onClick={() => check(d.id)} disabled={checking === d.id}>
                        {checking === d.id ? <span className="spinner" /> : <Icon name="refresh" />}Check
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => setRemoving(d)}>Remove</button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      <Modal open={!!disconnecting} onClose={() => setDisconnecting(null)} title={`Disconnect ${name(disconnecting)}?`}
        footer={<><button className="btn" onClick={() => setDisconnecting(null)}>Cancel</button><button className="btn btn-primary" onClick={disconnect}>Disconnect</button></>}>
        <p>Oriel deletes the stored access token. You can also revoke access on the provider&apos;s side. Connect again any time.</p>
      </Modal>

      <Modal open={cfOpen} onClose={() => setCfOpen(false)} title="Connect Cloudflare DNS"
        footer={<><button className="btn" onClick={() => setCfOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={saveCloudflare} disabled={!cfToken.trim()}>Connect</button></>}>
        <p>Create an API token in Cloudflare with the <b>Zone:DNS:Edit</b> permission for your domain&apos;s zone only, then paste it here. It is stored encrypted.</p>
        <label className="field">
          <span className="label">API token</span>
          <input className="input" type="password" autoComplete="off" value={cfToken} onChange={(e) => setCfToken(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") saveCloudflare(); }} />
        </label>
        {cfErr && <p className="err" role="alert">{cfErr}</p>}
      </Modal>

      <Modal open={!!removing} onClose={() => setRemoving(null)} title="Remove this domain?"
        footer={<><button className="btn" onClick={() => setRemoving(null)}>Cancel</button><button className="btn btn-primary" onClick={remove}>Remove</button></>}>
        <p><b>{removing?.hostname}</b> stops serving this project. DNS records Oriel created in Cloudflare are cleaned up too.</p>
      </Modal>
    </div>
  );
}
