"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Msg = { id?: number; role: "user" | "assistant"; content: string; credits?: number | null; action_kind?: string | null };
type Confirm = { title: string; body: string; label: string; run: () => Promise<void>; extra?: "autocommit" };
const KIND: Record<string, string> = { edit: "edit", build: "build", large: "large project", route: "routing" };
const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com";

export default function Workspace({ project, initialMessages, initialPrompt, activeRunId }: { project: any; initialMessages: Msg[]; initialPrompt: string; activeRunId: number | null }) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState(initialPrompt);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Saved");
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
  const [runId, setRunId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string; items?: string[] } | null>(null);

  const refreshMe = () => fetch("/api/me").then((r) => r.json()).then((j) => { setMe(j); setBalance(j.balance?.total ?? null); });
  const refreshSettings = () => fetch(`/api/projects/${project.id}/settings`).then((r) => r.json()).then(setSettings);
  const refreshFiles = () => supabaseBrowser().from("project_files").select("path").eq("project_id", project.id).then(({ data }) => setFiles((data ?? []).map((f: any) => f.path).sort()));

  useEffect(() => {
    fetch(`/api/projects/${project.id}/preview-url`).then((r) => r.json()).then((j) => setPreview(j.url));
    refreshMe(); refreshSettings(); refreshFiles();
    supabaseBrowser().from("my_connectors").select("provider").then(({ data }) => setConnected((data ?? []).map((d: any) => d.provider)));
    // a prompt from Home is sent automatically, once
    if (activeRunId && !autoSent.current) {
      autoSent.current = true;
      setMsgs((m) => [...m, { role: "assistant", content: "" }]); follow(activeRunId);
    } else if (initialPrompt && initialMessages.length === 0 && !autoSent.current) {
      autoSent.current = true; send(initialPrompt); history.replaceState(null, "", location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);
  useEffect(() => { confirmBox ? dlg.current?.showModal() : dlg.current?.close(); }, [confirmBox]);

  async function send(preset?: string) {
    const text = (preset ?? input).trim(); if (!text || busy) return;
    setBusy(true); setInput(""); setStatus("Queued");
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    const res = await fetch(`/api/projects/${project.id}/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: text }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { patchLast(j.error ?? "Could not send."); setStatus("Failed"); setBusy(false); return; }
    await follow(j.runId);
  }

  /** Poll a queued or running build until it finishes. The build keeps going if this tab closes. */
  async function follow(id: number) {
    setRunId(id); setBusy(true);
    let after = 0, misses = 0;
    try {
      for (;;) {
        const r = await fetch(`/api/jobs/${id}?after=${after}`);
        if (!r.ok) { if (++misses > 5) throw new Error("lost"); await sleep(3000); continue; }
        misses = 0;
        const j = await r.json();
        // between slices a running build is briefly "queued" again; only show queue status before it starts
        if (j.status === "queued" && after === 0 && !j.events.length) setStatus(j.stopping ? "Stopping" : j.ahead > 0 ? `In queue · ${j.ahead} ahead` : "Starting");
        for (const e of j.events) {
          after = e.id;
          if (e.type === "route") setStatus(e.kind === "edit" ? "Editing" : "Building");
          if (e.type === "file") { setStatus(`Writing ${e.path}`); setNonce((n) => n + 1); }
          if (e.type === "cost") setStatus((s) => s.replace(/ · .*$/, "") + ` · ${e.credits} credits`);
          if (e.type === "commit") setStatus("Committed to GitHub");
          if (e.type === "done") { patchLast(e.summary, e.credits); if (e.balance >= 0) setBalance(e.balance); setStatus("Saved"); setNonce((n) => n + 1); refreshFiles(); return; }
          if (e.type === "error") { patchLast(e.message); setStatus("Failed"); refreshMe(); return; }
        }
        if (j.stopping) setStatus("Stopping after this step");
        await sleep(1200);
      }
    } catch { patchLast("Lost track of the build. It keeps running in the background; reload the page to see the result."); setStatus("Disconnected"); }
    finally { setBusy(false); setRunId(null); }
  }
  async function stop() {
    if (!runId) return;
    setStatus("Stopping");
    await fetch(`/api/jobs/${runId}/cancel`, { method: "POST" });
  }
  const patchLast = (content: string, credits?: number) => setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content, credits }]);

  async function call(url: string, body: object, okText: (j: any) => string) {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setStatus(r.ok ? okText(j) : j.error ?? "Failed");
    return r.ok ? j : null;
  }
  async function publish() {
    setStatus("Checking and publishing"); setNotice(null);
    const r = await fetch(`/api/projects/${project.id}/publish`, { method: "POST" }); const j = await r.json().catch(() => ({}));
    if (r.ok) {
      setLive(j.url); setStatus(`Live v${j.version}`);
      if (j.review) setNotice({ tone: "info", text: "Published. Our automatic check flagged part of this site for a quick review by the Oriel team; it stays live meanwhile." });
    } else {
      setStatus("Not published");
      setNotice({ tone: "error", text: j.error ?? "Publishing failed.", items: (j.findings ?? []).map((f: any) => `${f.file}: ${f.message}`) });
    }
  }
  async function sellTemplate() {
    const title = prompt("Template title:", project.name); if (!title) return;
    const price = Number(prompt("Price in credits (0-5000):", "50")); if (!(price >= 0 && price <= 5000)) return;
    const category = prompt("Category (landing, store, portfolio, blog, dashboard, deck, community, business):", "landing") ?? "landing";
    const description = prompt("Short description (max 280 characters):", "") ?? "";
    await call("/api/templates", { projectId: project.id, title, priceCredits: Math.floor(price), category, description: description.slice(0, 280) }, () => "Template published to the marketplace");
  }
  async function toggleShowcase(on: boolean) {
    await fetch(`/api/projects/${project.id}/settings`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ showcase_opt_in: on }) });
    refreshSettings();
  }
  const action = (provider: string) => `/api/connectors/${provider}/action`;

  const ask = (c: Confirm) => setConfirmBox(c);
  const has = (p: string) => connected.includes(p);
  const github = () => ask({
    title: "Push to GitHub?", label: "Push", extra: settings.github_repo ? undefined : "autocommit",
    body: settings.github_repo ? `All project files are sent as one commit to ${settings.github_repo}.`
      : `Oriel creates a private repo oriel-${project.slug} in your GitHub account and sends all files as the first commit.`,
    run: async () => {
      setStatus("Pushing to GitHub");
      const j = await call(action("github"), { projectId: project.id, confirm: true, ...(settings.github_repo ? {} : { autocommit }) }, () => "Saved to GitHub");
      if (j) refreshSettings();
    },
  });
  const deploy = (provider: "vercel" | "netlify", label: string) => ask({
    title: `Deploy to ${label}?`, label: "Deploy",
    body: `All project files are deployed as a static site to your ${label} account. The site at ${project.slug}.${ROOT} does not change.`,
    run: async () => { setStatus(`Deploying to ${label}`); await call(action(provider), { projectId: project.id, confirm: true }, (j) => `Live at ${j.url}`); },
  });
  async function drive() {
    const docs = files.filter((f) => /\.(html|csv|md)$/.test(f));
    const path = prompt(`File to save to Drive:\n${docs.join("\n")}`, docs.includes("index.html") ? "index.html" : docs[0] ?? "");
    if (!path) return;
    ask({ title: "Save to Google Drive?", label: "Save", body: `${path} is saved as a new file in your Drive.`,
      run: async () => { setStatus("Saving to Drive"); await call(action("google_drive"), { projectId: project.id, confirm: true, path }, () => "Saved to Drive"); } });
  }
  async function supabaseList() {
    const j = await call(action("supabase"), { op: "list" }, () => "Choose a Supabase project");
    if (j) setSbProjects(j.projects ?? []);
  }
  async function supabaseLink(ref: string) {
    const j = await call(action("supabase"), { op: "link", projectId: project.id, ref }, (r) => `Linked to ${r.ref}`);
    if (j) { setSbProjects(null); refreshSettings(); }
  }
  const supabaseApply = () => ask({
    title: "Apply schema to Supabase?", label: "Run SQL",
    body: `The contents of supabase/schema.sql run on database ${settings.supabase_ref}. Review it first; database changes cannot be undone automatically.`,
    run: async () => { setStatus("Running SQL"); await call(action("supabase"), { projectId: project.id, confirm: true }, () => "Schema applied"); },
  });

  const lowCredit = balance != null && balance < 1;
  const tierRank = ["free", "builder", "pro", "studio"].indexOf(me?.tier ?? "free");

  return (
    <section className="page">
      {notice && (
        <div className={`banner${notice.tone === "error" ? " bad" : ""}`} role={notice.tone === "error" ? "alert" : "status"}>
          <span>{notice.text}{notice.items?.length ? <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>{notice.items.map((i) => <li key={i}>{i}</li>)}</ul> : null}
            {notice.tone === "error" && notice.items?.length ? <span className="mute" style={{ display: "block", marginTop: 8 }}>Ask the agent to remove these parts, then publish again.</span> : null}</span>
          <button className="pill sm" onClick={() => setNotice(null)}>Dismiss</button>
        </div>)}
      {lowCredit && (
        <div className="banner">
          <span>{me?.profile?.wallet_verified_at ? "You're out of credits. Top up or upgrade your tier to keep building." : "Connect a wallet to unlock 60 free credits per month."}</span>
          <a className="pill sm ink" href={me?.profile?.wallet_verified_at ? "/tiers" : "/account"}>{me?.profile?.wallet_verified_at ? "Top up" : "Connect wallet"}</a>
        </div>)}
      <div className="wsmeta">
        <div><h2 style={{ fontSize: 32 }}>{project.name}</h2>
          <p className="mono mute">{live ? <a href={live} target="_blank" rel="noreferrer">{live.replace("https://", "")}</a> : `${project.slug}.${ROOT} · not live yet`}</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="credit"><b>{balance?.toLocaleString("en-US") ?? "–"}</b> credits</span>
          <a className="pill sm" href={`/api/projects/${project.id}/download`}>Download ZIP</a>
          {live && <button className="pill sm" onClick={sellTemplate}>Sell as template</button>}
          <button className="pill ink sm" onClick={publish} disabled={busy}>Publish</button>
        </div>
      </div>
      <div className="ws">
        <div className="card chat">
          <div className="msgs" aria-live="polite">
            {msgs.length === 0 && <p className="mute" style={{ fontSize: 14 }}>Describe what you want to build: who it's for, what goes in it, and how it should feel.</p>}
            {msgs.map((m, i) => (
              <div key={i} className={`m ${m.role === "user" ? "u" : "a"}`}>
                {m.content || <span className="mute">{status}</span>}
                {m.role === "assistant" && m.credits != null && <span className="cost">{KIND[m.action_kind ?? ""] ?? ""} {m.credits} credits</span>}
              </div>))}
            <div ref={endRef} />
          </div>
          <div className="in">
            <textarea aria-label="Message" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Make the headline orange"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            {busy && runId ? <button className="pill sm" onClick={stop}>Stop</button>
              : <button className="pill ink sm" onClick={() => send()} disabled={busy}>Send</button>}
          </div>
        </div>
        <div className="card pv">
          <div className="bh">
            <div className="seg" role="group" aria-label="Preview size">
              <button className={!mobile ? "on" : ""} onClick={() => setMobile(false)}>Desktop</button>
              <button className={mobile ? "on" : ""} onClick={() => setMobile(true)}>Mobile</button>
            </div>
            <span className="mono mute" style={{ marginLeft: "auto" }} role="status">{status}</span>
          </div>
          {/* sandbox without allow-same-origin + separate preview origin = user code cannot touch the Oriel session */}
          {preview && <iframe key={nonce} className={`ws-frame${mobile ? " mobile" : ""}`} src={preview} sandbox="allow-scripts allow-forms allow-popups" title="Project preview" />}
          <div className="tools" aria-label="Project connectors">
            {has("github") ? <button className="pill sm" onClick={github}>{settings.github_repo ? "Commit to GitHub" : "Push to GitHub"}</button>
              : tierRank >= 1 && <a className="pill sm" href="/connectors">Connect GitHub</a>}
            {settings.github_repo && <span className="mono mute" style={{ alignSelf: "center" }}>{settings.github_autocommit ? "auto-commit on" : settings.github_repo}</span>}
            {has("vercel") && <button className="pill sm" onClick={() => deploy("vercel", "Vercel")}>Deploy to Vercel</button>}
            {has("netlify") && <button className="pill sm" onClick={() => deploy("netlify", "Netlify")}>Deploy to Netlify</button>}
            {has("google_drive") && <button className="pill sm" onClick={drive}>Save to Drive</button>}
            {has("supabase") && (settings.supabase_ref
              ? <>{files.includes("supabase/schema.sql") && <button className="pill sm" onClick={supabaseApply}>Apply Supabase schema</button>}
                  <span className="mono mute" style={{ alignSelf: "center" }}>DB: {settings.supabase_ref}</span></>
              : <button className="pill sm" onClick={supabaseList}>Use a Supabase database</button>)}
            {live && <label className="chk" style={{ margin: 0, marginLeft: "auto" }}><input type="checkbox" checked={!!settings.showcase_opt_in} onChange={(e) => toggleShowcase(e.target.checked)} /> Allow in showcase</label>}
          </div>
          {sbProjects && (
            <div className="tools">
              {sbProjects.length === 0 && <span className="mute" style={{ fontSize: 14 }}>No projects in your Supabase account yet. Create one at supabase.com first.</span>}
              {sbProjects.map((p) => <button key={p.ref} className="pill sm" onClick={() => supabaseLink(p.ref)}>{p.name} <span className="mono mute">{p.region}</span></button>)}
              <button className="pill sm" onClick={() => setSbProjects(null)}>Cancel</button>
            </div>)}
        </div>
      </div>
      <dialog ref={dlg} onClose={() => setConfirmBox(null)}>
        {confirmBox && <>
          <h3>{confirmBox.title}</h3>
          <p className="mute" style={{ margin: "10px 0 16px", fontSize: 14 }}>{confirmBox.body}</p>
          {confirmBox.extra === "autocommit" && <label className="chk"><input type="checkbox" checked={autocommit} onChange={(e) => setAutocommit(e.target.checked)} /> Commit automatically every time the agent changes the project</label>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="pill sm" onClick={() => setConfirmBox(null)}>Cancel</button>
            <button className="pill ink sm" onClick={async () => { const c = confirmBox; setConfirmBox(null); await c.run(); }}>{confirmBox.label}</button>
          </div>
        </>}
      </dialog>
    </section>
  );
}
