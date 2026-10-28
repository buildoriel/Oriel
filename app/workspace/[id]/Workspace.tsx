"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Msg = { id?: number; role: "user" | "assistant"; content: string; credits?: number | null; action_kind?: string | null };
type Confirm = { title: string; body: string; label: string; run: () => Promise<void>; extra?: "autocommit" };
const KIND: Record<string, string> = { edit: "edit", build: "build", large: "proyek besar", route: "klasifikasi" };
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com";

export default function Workspace({ project, initialMessages, initialPrompt }: { project: any; initialMessages: Msg[]; initialPrompt: string }) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState(initialPrompt);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Tersimpan");
  const [preview, setPreview] = useState(""); const [nonce, setNonce] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [live, setLive] = useState<string | null>(project.published_version ? `https://${project.slug}.${ROOT}` : null);
  const [connected, setConnected] = useState<string[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [files, setFiles] = useState<string[]>([]);
  const [sbProjects, setSbProjects] = useState<any[] | null>(null);
  const [confirmBox, setConfirmBox] = useState<Confirm | null>(null);
  const [autocommit, setAutocommit] = useState(true);
  const dlg = useRef<HTMLDialogElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  const refreshMe = () => fetch("/api/me").then((r) => r.json()).then((j) => { setMe(j); setBalance(j.balance?.total ?? null); });
  const refreshSettings = () => fetch(`/api/projects/${project.id}/settings`).then((r) => r.json()).then(setSettings);
  const refreshFiles = () => supabaseBrowser().from("project_files").select("path").eq("project_id", project.id).then(({ data }) => setFiles((data ?? []).map((f: any) => f.path).sort()));

  useEffect(() => {
    fetch(`/api/projects/${project.id}/preview-url`).then((r) => r.json()).then((j) => setPreview(j.url));
    refreshMe(); refreshSettings(); refreshFiles();
    supabaseBrowser().from("my_connectors").select("provider").then(({ data }) => setConnected((data ?? []).map((d: any) => d.provider)));
    // prompt dari Home dikirim otomatis sekali
    if (initialPrompt && initialMessages.length === 0 && !autoSent.current) {
      autoSent.current = true; send(initialPrompt); history.replaceState(null, "", location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);
  useEffect(() => { confirmBox ? dlg.current?.showModal() : dlg.current?.close(); }, [confirmBox]);

  async function send(preset?: string) {
    const text = (preset ?? input).trim(); if (!text || busy) return;
    setBusy(true); setInput(""); setStatus("Membaca permintaan");
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch(`/api/projects/${project.id}/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: text }) });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); patchLast(j.error ?? "Gagal mengirim."); setStatus("Gagal"); return; }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const e = JSON.parse(p.slice(6));
          if (e.type === "route") setStatus(e.kind === "edit" ? "Mengedit" : "Membangun");
          if (e.type === "file") { setStatus(`Menulis ${e.path}`); setNonce((n) => n + 1); }
          if (e.type === "cost") setStatus((s) => s.replace(/ · .*$/, "") + ` · ${e.credits} kredit`);
          if (e.type === "commit") setStatus("Commit ke GitHub");
          if (e.type === "done") { patchLast(e.summary, e.credits); setBalance(e.balance); setStatus("Tersimpan"); setNonce((n) => n + 1); refreshFiles(); }
          if (e.type === "error") { patchLast(e.message); setStatus("Gagal"); }
        }
      }
    } catch { patchLast("Koneksi terputus. Hasil yang sudah jadi tetap tersimpan; muat ulang halaman."); setStatus("Terputus"); }
    finally { setBusy(false); }
  }
  const patchLast = (content: string, credits?: number) => setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content, credits }]);

  async function call(url: string, body: object, okText: (j: any) => string) {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setStatus(r.ok ? okText(j) : j.error ?? "Gagal");
    return r.ok ? j : null;
  }
  async function publish() {
    setStatus("Menayangkan");
    const r = await fetch(`/api/projects/${project.id}/publish`, { method: "POST" }); const j = await r.json();
    if (r.ok) { setLive(j.url); setStatus(`Tayang v${j.version}`); } else setStatus(j.error);
  }
  async function sellTemplate() {
    const title = prompt("Judul template:", project.name); if (!title) return;
    const price = Number(prompt("Harga dalam kredit (0-5000):", "50")); if (!(price >= 0 && price <= 5000)) return;
    const category = prompt("Kategori (landing, store, portfolio, blog, dashboard, deck, community, business):", "landing") ?? "landing";
    const description = prompt("Deskripsi singkat (maks 280 karakter):", "") ?? "";
    await call("/api/templates", { projectId: project.id, title, priceCredits: Math.floor(price), category, description: description.slice(0, 280) }, () => "Template terbit di marketplace");
  }
  async function toggleShowcase(on: boolean) {
    await fetch(`/api/projects/${project.id}/settings`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ showcase_opt_in: on }) });
    refreshSettings();
  }
  const action = (provider: string) => `/api/connectors/${provider}/action`;

  const ask = (c: Confirm) => setConfirmBox(c);
  const has = (p: string) => connected.includes(p);
  const github = () => ask({
    title: "Push ke GitHub?", label: "Push", extra: settings.github_repo ? undefined : "autocommit",
    body: settings.github_repo ? `Semua file proyek dikirim sebagai satu commit ke ${settings.github_repo}.`
      : `Oriel membuat repo privat oriel-${project.slug} di akun GitHub-mu lalu mengirim semua file sebagai commit pertama.`,
    run: async () => {
      setStatus("Push ke GitHub");
      const j = await call(action("github"), { projectId: project.id, confirm: true, ...(settings.github_repo ? {} : { autocommit }) }, () => "Tersimpan di GitHub");
      if (j) refreshSettings();
    },
  });
  const deploy = (provider: "vercel" | "netlify", label: string) => ask({
    title: `Deploy ke ${label}?`, label: "Deploy",
    body: `Semua file proyek di-deploy sebagai situs statis ke akun ${label}-mu. Situs di ${project.slug}.${ROOT} tidak berubah.`,
    run: async () => { setStatus(`Deploy ke ${label}`); await call(action(provider), { projectId: project.id, confirm: true }, (j) => `Live di ${j.url}`); },
  });
  async function drive() {
    const docs = files.filter((f) => /\.(html|csv|md)$/.test(f));
    const path = prompt(`File yang disimpan ke Drive:\n${docs.join("\n")}`, docs.includes("index.html") ? "index.html" : docs[0] ?? "");
    if (!path) return;
    ask({ title: "Simpan ke Google Drive?", label: "Simpan", body: `${path} disimpan sebagai file baru di Drive-mu.`,
      run: async () => { setStatus("Menyimpan ke Drive"); await call(action("google_drive"), { projectId: project.id, confirm: true, path }, () => "Tersimpan di Drive"); } });
  }
  async function supabaseList() {
    const j = await call(action("supabase"), { op: "list" }, () => "Pilih proyek Supabase");
    if (j) setSbProjects(j.projects ?? []);
  }
  async function supabaseLink(ref: string) {
    const j = await call(action("supabase"), { op: "link", projectId: project.id, ref }, (r) => `Tertaut ke ${r.ref}`);
    if (j) { setSbProjects(null); refreshSettings(); }
  }
  const supabaseApply = () => ask({
    title: "Terapkan schema ke Supabase?", label: "Jalankan SQL",
    body: `Isi supabase/schema.sql dijalankan di database ${settings.supabase_ref}. Periksa dulu isinya; perubahan database tidak bisa dibatalkan otomatis.`,
    run: async () => { setStatus("Menjalankan SQL"); await call(action("supabase"), { projectId: project.id, confirm: true }, () => "Schema diterapkan"); },
  });

  const lowCredit = balance != null && balance < 1;
  const tierRank = ["free", "builder", "pro", "studio"].indexOf(me?.tier ?? "free");

  return (
    <section className="page">
      {lowCredit && (
        <div className="banner">
          <span>{me?.profile?.wallet_verified_at ? "Kreditmu habis. Top-up atau naikkan tier untuk lanjut membangun." : "Sambungkan wallet untuk mengaktifkan 60 kredit Free per bulan."}</span>
          <a className="pill sm ink" href={me?.profile?.wallet_verified_at ? "/tiers" : "/akun"}>{me?.profile?.wallet_verified_at ? "Top-up" : "Sambungkan wallet"}</a>
        </div>)}
      <div className="wsmeta">
        <div><h2 style={{ fontSize: 32 }}>{project.name}</h2>
          <p className="mono mute">{live ? <a href={live} target="_blank" rel="noreferrer">{live.replace("https://", "")}</a> : `${project.slug}.${ROOT} · belum tayang`}</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="credit"><b>{balance?.toLocaleString("id-ID") ?? "–"}</b> kredit</span>
          <a className="pill sm" href={`/api/projects/${project.id}/download`}>Download ZIP</a>
          {live && <button className="pill sm" onClick={sellTemplate}>Jual sebagai template</button>}
          <button className="pill ink sm" onClick={publish} disabled={busy}>Publish</button>
        </div>
      </div>
      <div className="ws">
        <div className="card chat">
          <div className="msgs" aria-live="polite">
            {msgs.length === 0 && <p className="mute" style={{ fontSize: 14 }}>Jelaskan apa yang mau kamu buat: untuk siapa, isinya apa, nuansanya seperti apa.</p>}
            {msgs.map((m, i) => (
              <div key={i} className={`m ${m.role === "user" ? "u" : "a"}`}>
                {m.content || <span className="mute">{status}</span>}
                {m.role === "assistant" && m.credits != null && <span className="cost">{KIND[m.action_kind ?? ""] ?? ""} {m.credits} kredit</span>}
              </div>))}
            <div ref={endRef} />
          </div>
          <div className="in">
            <textarea aria-label="Pesan" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ganti warna judul jadi oranye"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className="pill ink sm" onClick={() => send()} disabled={busy}>Kirim</button>
          </div>
        </div>
        <div className="card pv">
          <div className="bh">
            <div className="seg" role="group" aria-label="Ukuran pratinjau">
              <button className={!mobile ? "on" : ""} onClick={() => setMobile(false)}>Desktop</button>
              <button className={mobile ? "on" : ""} onClick={() => setMobile(true)}>HP</button>
            </div>
            <span className="mono mute" style={{ marginLeft: "auto" }} role="status">{status}</span>
          </div>
          {/* sandbox tanpa allow-same-origin + origin preview terpisah = kode user tidak bisa menyentuh sesi Oriel */}
          {preview && <iframe key={nonce} className={`ws-frame${mobile ? " mobile" : ""}`} src={preview} sandbox="allow-scripts allow-forms allow-popups" title="Pratinjau proyek" />}
          <div className="tools" aria-label="Konektor proyek">
            {has("github") ? <button className="pill sm" onClick={github}>{settings.github_repo ? "Commit ke GitHub" : "Push ke GitHub"}</button>
              : tierRank >= 1 && <a className="pill sm" href="/connectors">Sambungkan GitHub</a>}
            {settings.github_repo && <span className="mono mute" style={{ alignSelf: "center" }}>{settings.github_autocommit ? "auto-commit aktif" : settings.github_repo}</span>}
            {has("vercel") && <button className="pill sm" onClick={() => deploy("vercel", "Vercel")}>Deploy ke Vercel</button>}
            {has("netlify") && <button className="pill sm" onClick={() => deploy("netlify", "Netlify")}>Deploy ke Netlify</button>}
            {has("google_drive") && <button className="pill sm" onClick={drive}>Simpan ke Drive</button>}
            {has("supabase") && (settings.supabase_ref
              ? <>{files.includes("supabase/schema.sql") && <button className="pill sm" onClick={supabaseApply}>Terapkan schema Supabase</button>}
                  <span className="mono mute" style={{ alignSelf: "center" }}>DB: {settings.supabase_ref}</span></>
              : <button className="pill sm" onClick={supabaseList}>Pakai database Supabase</button>)}
            {live && <label className="chk" style={{ margin: 0, marginLeft: "auto" }}><input type="checkbox" checked={!!settings.showcase_opt_in} onChange={(e) => toggleShowcase(e.target.checked)} /> Boleh tampil di showcase</label>}
          </div>
          {sbProjects && (
            <div className="tools">
              {sbProjects.length === 0 && <span className="mute" style={{ fontSize: 14 }}>Belum ada proyek di akun Supabase-mu. Buat dulu di supabase.com.</span>}
              {sbProjects.map((p) => <button key={p.ref} className="pill sm" onClick={() => supabaseLink(p.ref)}>{p.name} <span className="mono mute">{p.region}</span></button>)}
              <button className="pill sm" onClick={() => setSbProjects(null)}>Batal</button>
            </div>)}
        </div>
      </div>
      <dialog ref={dlg} onClose={() => setConfirmBox(null)}>
        {confirmBox && <>
          <h3>{confirmBox.title}</h3>
          <p className="mute" style={{ margin: "10px 0 16px", fontSize: 14 }}>{confirmBox.body}</p>
          {confirmBox.extra === "autocommit" && <label className="chk"><input type="checkbox" checked={autocommit} onChange={(e) => setAutocommit(e.target.checked)} /> Commit otomatis setiap kali agent mengubah proyek</label>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="pill sm" onClick={() => setConfirmBox(null)}>Batal</button>
            <button className="pill ink sm" onClick={async () => { const c = confirmBox; setConfirmBox(null); await c.run(); }}>{confirmBox.label}</button>
          </div>
        </>}
      </dialog>
    </section>
  );
}
