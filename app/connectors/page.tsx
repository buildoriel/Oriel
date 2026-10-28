"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const CONS = [
  ["github", "Gh", "GitHub", "Simpan kode ke repo milikmu. Setiap push menjadi commit.", "Builder"],
  ["vercel", "Ve", "Vercel", "Deploy proyek ke akun Vercel-mu.", "Pro"],
  ["netlify", "Ne", "Netlify", "Deploy proyek ke akun Netlify-mu.", "Pro"],
  ["supabase", "Sb", "Supabase", "Database untuk form, toko, dan dashboard.", "Pro"],
  ["google_drive", "Gd", "Google Drive", "Simpan dokumen dan deck ke Drive (hanya file buatan Oriel).", "Pro"],
  ["cloudflare", "Cf", "Cloudflare DNS", "Atur DNS custom domain secara otomatis.", "Studio"],
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
    const token = prompt("Tempel Cloudflare API Token (izin Zone:DNS:Edit untuk zona domainmu saja):"); if (!token) return;
    const r = await fetch("/api/connectors/cloudflare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    r.ok ? load() : setErr((await r.json()).error);
  }
  async function addDomain(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/domains", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: pid, hostname: host.trim().toLowerCase() }) });
    r.ok ? (setHost(""), load()) : setErr((await r.json()).error);
  }
  async function check(id: string) { await fetch(`/api/domains/${id}`, { method: "POST" }); load(); }
  async function remove(id: string) { if (confirm("Putuskan domain ini dari proyek?")) { await fetch(`/api/domains/${id}`, { method: "DELETE" }); load(); } }

  return (
    <section className="page">
      <h2>Connectors &amp; Domains</h2>
      <p className="mute" style={{ marginTop: 12, maxWidth: "56ch" }}>Sambungkan akunmu dengan izin seminimal mungkin. Putuskan kapan saja. Push dan deploy selalu minta konfirmasi.</p>
      {err && <p className="err" style={{ marginTop: 12 }}>{err}</p>}
      <div className="grid cons">{CONS.map(([id, lg, name, desc, tier]) => {
        const on = connected.includes(id);
        return (
          <div key={id} className="card con">
            <div className="hd"><span className="lg">{lg}</span><span className={`st${on ? " ok" : ""}`}>{on ? "Tersambung" : tier}</span></div>
            <h3>{name}</h3><p className="mute" style={{ fontSize: 14 }}>{desc}</p>
            {on ? <button className="pill sm" onClick={() => disconnect(id)}>Putuskan</button>
              : id === "cloudflare" ? <button className="pill sm ink" onClick={cloudflare}>Sambungkan</button>
              : <a className="pill sm ink" href={`/api/connectors/${id}/start`}>Sambungkan</a>}
          </div>);
      })}</div>
      <div className="dom">
        <div className="card">
          <h3>Sambungkan domain</h3>
          <p className="mute" style={{ fontSize: 14, margin: "8px 0 16px" }}>Tersedia untuk Pro dan Studio. Tambahkan record ini di pengelola domainmu, lalu tekan Cek.</p>
          <form onSubmit={addDomain} style={{ display: "grid", gap: 12 }}>
            <label className="field">Proyek<select value={pid} onChange={(e) => setPid(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <div className="inp"><input style={{ fontSize: 18 }} placeholder="www.namadomainmu.com" value={host} onChange={(e) => setHost(e.target.value)} aria-label="Domain" /><button className="pill sm ink">Tambah</button></div>
          </form>
          <div className="dns" style={{ marginTop: 16 }}><span className="mute">Tipe</span><span>CNAME</span><span className="mute">Nama</span><span>www (atau subdomain pilihanmu)</span><span className="mute">Nilai</span><span>{cname}</span></div>
        </div>
        <div className="card">
          <h3>Domainmu</h3>
          {domains.length === 0 && <p className="mute" style={{ fontSize: 14, marginTop: 8 }}>Belum ada domain tersambung.</p>}
          <div className="list" style={{ marginTop: 12 }}>{domains.map((d) => (
            <div key={d.id} className="row-item" style={{ flexWrap: "wrap" }}>
              <span><b>{d.hostname}</b><br /><span className="mono mute">{({ pending: "Menunggu DNS", dns_ok: "Menerbitkan HTTPS", active: "Aktif", failed: "Gagal" } as any)[d.status]}</span>
                {d.last_error && <><br /><span className="err" style={{ fontSize: 12 }}>{d.last_error}</span></>}</span>
              <span style={{ display: "flex", gap: 6 }}><button className="pill sm" onClick={() => check(d.id)}>Cek</button><button className="pill sm" onClick={() => remove(d.id)}>Hapus</button></span>
            </div>))}</div>
        </div>
      </div>
    </section>
  );
}
