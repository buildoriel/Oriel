"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { id?: number; role: "user" | "assistant"; content: string; credits?: number | null; action_kind?: string | null };
const KIND: Record<string, string> = { edit: "edit", build: "build", large: "proyek besar", route: "klasifikasi" };

export default function Workspace({ project, initialMessages, initialPrompt }: { project: any; initialMessages: Msg[]; initialPrompt: string }) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState(initialPrompt);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Tersimpan");
  const [preview, setPreview] = useState(""); const [nonce, setNonce] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [live, setLive] = useState<string | null>(project.published_version ? `https://${project.slug}.buildoriel.com` : null);
  const confirmRef = useRef<HTMLDialogElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetch(`/api/projects/${project.id}/preview-url`).then((r) => r.json()).then((j) => setPreview(j.url)); refreshBalance(); }, [project.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);
  const refreshBalance = () => fetch("/api/me").then((r) => r.json()).then((j) => setBalance(j.balance?.total ?? null));

  async function send() {
    const text = input.trim(); if (!text || busy) return;
    setBusy(true); setInput(""); setStatus("Membaca permintaan");
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    const res = await fetch(`/api/projects/${project.id}/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: text }) });
    if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); patchLast(j.error ?? "Gagal mengirim."); setBusy(false); setStatus("Gagal"); return; }
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
        if (e.type === "done") { patchLast(e.summary, e.credits); setBalance(e.balance); setStatus("Tersimpan"); setNonce((n) => n + 1); }
        if (e.type === "error") { patchLast(e.message); setStatus("Gagal"); }
      }
    }
    setBusy(false);
  }
  const patchLast = (content: string, credits?: number) => setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content, credits }]);

  async function publish() {
    setStatus("Menayangkan");
    const r = await fetch(`/api/projects/${project.id}/publish`, { method: "POST" }); const j = await r.json();
    if (r.ok) { setLive(j.url); setStatus(`Published v${j.version}`); } else setStatus(j.error);
  }
  async function sellTemplate() {
    const title = prompt("Judul template:", project.name); if (!title) return;
    const price = Number(prompt("Harga dalam kredit (0-5000):", "50")); if (!(price >= 0)) return;
    const category = prompt("Kategori (landing, store, portfolio, blog, dashboard, deck, community, business):", "landing") ?? "landing";
    const r = await fetch("/api/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: project.id, title, priceCredits: price, category, description: "" }) });
    setStatus(r.ok ? "Template terbit di marketplace" : (await r.json()).error);
  }
  async function pushGithub() {
    confirmRef.current?.close(); setStatus("Push ke GitHub");
    const r = await fetch(`/api/connectors/github/action`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: project.id, confirm: true }) });
    const j = await r.json(); setStatus(r.ok ? "Pushed ke GitHub" : j.error);
  }

  return (
    <section className="page">
      <div className="wsmeta">
        <div><h2 style={{ fontSize: 32 }}>{project.name}</h2>
          <p className="mono mute">{live ? <a href={live} target="_blank" rel="noreferrer">{live.replace("https://", "")}</a> : `${project.slug}.buildoriel.com · belum tayang`}</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="credit"><b>{balance?.toLocaleString("id-ID") ?? "–"}</b> kredit</span>
          <a className="pill sm" href={`/api/projects/${project.id}/download`}>Download ZIP</a>
          <button className="pill sm" onClick={() => confirmRef.current?.showModal()}>Push ke GitHub</button>
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
            <button className="pill ink sm" onClick={send} disabled={busy}>Kirim</button>
          </div>
        </div>
        <div className="card pv">
          <div className="bh">
            <div className="seg" role="group" aria-label="Ukuran pratinjau">
              <button className={!mobile ? "on" : ""} onClick={() => setMobile(false)}>Desktop</button>
              <button className={mobile ? "on" : ""} onClick={() => setMobile(true)}>HP</button>
            </div>
            <span className="mono mute" style={{ marginLeft: "auto" }}>{status}</span>
          </div>
          {/* sandbox tanpa allow-same-origin + origin preview terpisah = kode user tidak bisa menyentuh sesi Oriel */}
          {preview && <iframe key={nonce} className={`ws-frame${mobile ? " mobile" : ""}`} src={preview} sandbox="allow-scripts allow-forms allow-popups" title="Pratinjau proyek" />}
        </div>
      </div>
      <dialog ref={confirmRef}>
        <h3>Push ke GitHub?</h3>
        <p className="mute" style={{ margin: "10px 0 20px", fontSize: 14 }}>Semua file proyek akan dikirim sebagai satu commit ke repo oriel-{project.slug} di akun GitHub-mu.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="pill sm" onClick={() => confirmRef.current?.close()}>Batal</button>
          <button className="pill ink sm" onClick={pushGithub}>Push</button>
        </div>
      </dialog>
    </section>
  );
}
