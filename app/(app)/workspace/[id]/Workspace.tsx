"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Composer, EstimateLabel, Menu, Modal, useEstimate, useToasts, type MenuEntry, type PendingFile } from "@/components/ui";
import { ShareDialog } from "@/components/ShareDialog";
import { MAX_ATTACHMENTS, uploadError, uploadType, type Attachment } from "@/lib/uploads";
import { Icon } from "@/components/Icon";
import { OrielMark } from "@/components/Logo";
import { refreshShell } from "@/components/AppShell";
import ws from "./workspace.module.css";

type Step = { text: string };
type Msg = { id?: number; role: "user" | "assistant"; content: string; credits?: number | null; action_kind?: string | null; steps?: Step[]; error?: boolean; attachments?: Attachment[] | null };
type Version = { version: number; file_count: number; bytes: number; created_at: string };
type Confirm = { title: string; body: string; label: string; run: () => Promise<void>; extra?: "autocommit" };
type Device = "desktop" | "tablet" | "mobile";
type CodeFile = { path: string; content: string };

const KIND: Record<string, string> = { edit: "Edit", build: "Build", large: "Large project", route: "Routing" };
const MODEL: Record<string, string> = {
  "claude-haiku-5-5": "Haiku 5.5", "claude-sonnet-5-5": "Sonnet 5.5", "claude-opus-5-5": "Opus 5.5", "claude-fable-5-1": "Fable 5.1",
};
const CATEGORIES = ["landing", "store", "portfolio", "blog", "dashboard", "deck", "community", "business"];
const STARTERS = [
  "Add a pricing section with three plans",
  "Make it feel more premium: more whitespace, refined type",
  "Add a contact form and a footer with social links",
];
const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com";
const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function Workspace({ project: initial, role, initialMessages, initialPrompt, activeRunId }: {
  project: { id: string; name: string; slug: string; published_version: number | null };
  role: "owner" | "editor"; initialMessages: Msg[]; initialPrompt: string; activeRunId: number | null;
}) {
  const owner = role === "owner";
  const [project, setProject] = useState(initial);
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [runId, setRunId] = useState<number | null>(null);
  const [stopping, setStopping] = useState(false);

  const [preview, setPreview] = useState(""); const [nonce, setNonce] = useState(0);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<Device>("desktop");
  const [pane, setPane] = useState<"chat" | "preview">("chat");
  const [codeFiles, setCodeFiles] = useState<CodeFile[] | null>(null);
  const [openFile, setOpenFile] = useState("index.html");

  const [me, setMe] = useState<any>(null);
  const [live, setLive] = useState<string | null>(initial.published_version ? `https://${initial.slug}.${ROOT}` : null);
  const [version, setVersion] = useState<number | null>(initial.published_version);
  const [publishing, setPublishing] = useState(false);
  const [connected, setConnected] = useState<string[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [files, setFiles] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string; items?: string[] } | null>(null);

  const [confirmBox, setConfirmBox] = useState<Confirm | null>(null);
  const [autocommit, setAutocommit] = useState(true);
  const [sbProjects, setSbProjects] = useState<any[] | null>(null);
  const [sell, setSell] = useState<{ title: string; description: string; category: string; price: string } | null>(null);
  const [drivePick, setDrivePick] = useState<string | null>(null);
  const [rename, setRename] = useState<string | null>(null);
  const [versions, setVersions] = useState<{ live: number | null; versions: Version[] } | null | "loading">(null);
  const [del, setDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [share, setShare] = useState(false);
  const est = useEstimate(busy ? "" : input, project.id);
  const [toasts, toast] = useToasts();

  const endRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshMe = () => fetch("/api/me").then((r) => r.json()).then(setMe).catch(() => {});
  const refreshSettings = () => fetch(`/api/projects/${project.id}/settings`).then((r) => r.json()).then(setSettings).catch(() => {});
  const refreshFiles = () => supabaseBrowser().from("project_files").select("path").eq("project_id", project.id)
    .then(({ data }) => setFiles((data ?? []).map((f: any) => f.path).sort()));
  const loadCode = () => supabaseBrowser().from("project_files").select("path, content").eq("project_id", project.id)
    .then(({ data }) => setCodeFiles(((data ?? []) as CodeFile[]).sort((a, b) => a.path.localeCompare(b.path))));
  // reload the preview at most every 1.5 s while files stream in
  const reloadPreview = () => {
    if (reloadTimer.current) return;
    reloadTimer.current = setTimeout(() => { reloadTimer.current = null; setNonce((n) => n + 1); }, 1500);
  };

  useEffect(() => {
    fetch(`/api/projects/${project.id}/preview-url`).then((r) => r.json()).then((j) => setPreview(j.url)).catch(() => {});
    refreshMe(); refreshSettings(); refreshFiles();
    supabaseBrowser().from("my_connectors").select("provider").then(({ data }) => setConnected((data ?? []).map((d: any) => d.provider)));
    if (activeRunId && !autoSent.current) {
      // a build that was still running when the page was opened (e.g. after closing the tab)
      autoSent.current = true;
      setMsgs((m) => [...m, { role: "assistant", content: "" }]); follow(activeRunId);
    } else if (initialPrompt && initialMessages.length === 0 && !autoSent.current) {
      // the prompt typed on the start screen is sent once
      autoSent.current = true; send(initialPrompt); history.replaceState(null, "", location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, steps]);
  useEffect(() => { if (view === "code") loadCode(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [view]);

  const addStep = (text: string) => setSteps((s) => (s.at(-1)?.text === text ? s : [...s, { text }]));

  function attach(list: File[]) {
    setPending((cur) => {
      const room = MAX_ATTACHMENTS - cur.length;
      if (list.length > room) toast(`Up to ${MAX_ATTACHMENTS} files per message.`);
      return [...cur, ...list.slice(0, Math.max(0, room)).map((file) => {
        const error = uploadError(file.name, file.size) ?? undefined;
        const raster = !error && uploadType(file.name)?.kind === "image";
        return { file, error, url: raster ? URL.createObjectURL(file) : undefined };
      })];
    });
  }
  function unattach(i: number) {
    setPending((cur) => { if (cur[i]?.url) URL.revokeObjectURL(cur[i].url!); return cur.filter((_, k) => k !== i); });
  }

  /** Upload the attached files one by one (each becomes a project file), then queue the build. */
  async function send(preset?: string) {
    const files = preset ? [] : pending;
    const text = (preset ?? input).trim() || (files.length ? `Use the attached file${files.length === 1 ? "" : "s"}.` : "");
    if (!text || busy || files.some((f) => f.error)) return;
    setBusy(true); setStatus(files.length ? "Uploading files" : "Queued"); setSteps([]); setNotice(null); setPane("chat");
    const attachments: Attachment[] = [];
    for (const f of files) {
      const body = new FormData(); body.append("file", f.file);
      const r = await fetch(`/api/projects/${project.id}/upload`, { method: "POST", body });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast(j.error ?? `Could not upload ${f.file.name}.`); setBusy(false); setStatus(""); return; }
      attachments.push(j);
    }
    setInput(""); files.forEach((f) => f.url && URL.revokeObjectURL(f.url)); if (!preset) setPending([]);
    setMsgs((m) => [...m, { role: "user", content: text, attachments }, { role: "assistant", content: "" }]);
    const res = await fetch(`/api/projects/${project.id}/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: text, attachments }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { finish(j.error ?? "Could not send your message.", undefined, true); setBusy(false); setStatus(""); return; }
    if (attachments.length) refreshFiles();
    await follow(j.runId);
  }

  /** Follow a queued or running build until it finishes. The build keeps going if this tab closes. */
  async function follow(id: number) {
    setRunId(id); setBusy(true); setStopping(false);
    let after = 0, misses = 0;
    const local: Step[] = [];
    const step = (t: string) => { local.push({ text: t }); addStep(t); };
    try {
      for (;;) {
        const r = await fetch(`/api/jobs/${id}?after=${after}`);
        if (!r.ok) { if (++misses > 5) throw new Error("lost"); await sleep(3000); continue; }
        misses = 0;
        const j = await r.json();
        // between slices a running build is briefly "queued" again; only show queue status before it starts
        if (j.status === "queued" && after === 0 && !j.events.length) setStatus(j.stopping ? "Stopping" : j.ahead > 0 ? `In queue, ${j.ahead} ahead` : "Starting");
        for (const e of j.events) {
          after = e.id;
          if (e.type === "route") { const t = `${KIND[e.kind] ?? "Build"} with ${MODEL[e.model] ?? e.model}`; setStatus(t); step(t); }
          if (e.type === "file") { setStatus(`${e.op === "delete" ? "Removing" : "Writing"} ${e.path}`); step(`${e.op === "delete" ? "Removed" : "Wrote"} ${e.path}`); reloadPreview(); }
          if (e.type === "cost") setStatus((s) => s.replace(/ · .*$/, "") + ` · ${e.credits} credits`);
          if (e.type === "commit") step("Committed to GitHub");
          if (e.type === "text" && e.text?.trim()) step(e.text.trim().split("\n")[0].slice(0, 140));
          if (e.type === "done") { finish(e.summary, e.credits, false, local); setNonce((n) => n + 1); refreshFiles(); if (view === "code") loadCode(); refreshShell(); return; }
          if (e.type === "error") { finish(e.message, undefined, true, local); refreshMe(); refreshShell(); return; }
        }
        if (j.stopping) setStatus("Stopping after this step");
        await sleep(1200);
      }
    } catch { finish("Lost track of the build. It keeps running in the background; reload the page to see the result.", undefined, true); }
    finally { setBusy(false); setRunId(null); setStopping(false); setStatus(""); }
  }
  const finish = (content: string, credits?: number, error = false, done: Step[] = []) =>
    setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content, credits, steps: done.length ? done : undefined, error }]);

  async function stop() {
    if (!runId) return;
    setStopping(true); setStatus("Stopping after this step");
    await fetch(`/api/jobs/${runId}/cancel`, { method: "POST" });
  }

  async function call(url: string, body: object, okText: (j: any) => string, method = "POST") {
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    toast(r.ok ? okText(j) : j.error ?? "Something went wrong.");
    return r.ok ? j : null;
  }
  async function publish() {
    setPublishing(true); setNotice(null);
    const r = await fetch(`/api/projects/${project.id}/publish`, { method: "POST" }); const j = await r.json().catch(() => ({}));
    setPublishing(false);
    if (r.ok) {
      setLive(j.url); setVersion(j.version); toast(`Published version ${j.version}`); refreshShell();
      if (j.review) setNotice({ tone: "info", text: "Published. The automatic check flagged part of this site for a quick review by the Oriel team; it stays live meanwhile." });
    } else {
      setNotice({ tone: "error", text: j.error ?? "Publishing failed.", items: (j.findings ?? []).map((f: any) => `${f.file}: ${f.message}`) });
    }
  }
  async function saveRename() {
    const name = rename?.trim(); if (!name) return;
    const j = await call(`/api/projects/${project.id}/settings`, { name }, () => "Project renamed", "PATCH");
    if (j) { setProject((p) => ({ ...p, name })); refreshShell(); }
    setRename(null);
  }
  async function submitTemplate() {
    if (!sell) return;
    const price = Math.floor(Number(sell.price));
    if (!(price >= 0 && price <= 5000)) return toast("Price must be between 0 and 5,000 credits.");
    const j = await call("/api/templates", { projectId: project.id, title: sell.title, description: sell.description.slice(0, 280), category: sell.category, priceCredits: price }, () => "Template published to the marketplace");
    if (j) setSell(null);
  }
  async function toggleShowcase() {
    await call(`/api/projects/${project.id}/settings`, { showcase_opt_in: !settings.showcase_opt_in }, () => settings.showcase_opt_in ? "Removed from showcase" : "Allowed in showcase", "PATCH");
    refreshSettings();
  }

  async function openVersions() {
    setVersions("loading");
    const r = await fetch(`/api/projects/${project.id}/versions`); const j = await r.json().catch(() => null);
    if (!r.ok || !j) { setVersions(null); return toast(j?.error ?? "Could not load versions."); }
    setVersions(j);
  }
  const restore = (v: number) => setConfirmBox({
    title: `Restore version ${v}?`, label: "Restore",
    body: `${project.slug}.${ROOT} switches to version ${v}, and the project's files are replaced with that version so the next change builds on it. Changes made since your last publish are lost. Other versions stay in the history.`,
    run: async () => {
      const r = await fetch(`/api/projects/${project.id}/versions/${v}`, { method: "POST" }); const j = await r.json().catch(() => ({}));
      if (!r.ok) return toast(j.error ?? "Restore failed.");
      setVersion(v); setLive(`https://${project.slug}.${ROOT}`); setVersions(null);
      setNonce((n) => n + 1); refreshFiles(); if (view === "code") loadCode(); refreshShell();
      toast(`Restored version ${v}`);
    },
  });
  const unpublish = () => setConfirmBox({
    title: "Unpublish this site?", label: "Unpublish",
    body: `${project.slug}.${ROOT} and any custom domains stop showing the site within a minute. Your files and version history stay, so you can publish again any time.`,
    run: async () => {
      const r = await fetch(`/api/projects/${project.id}/publish`, { method: "DELETE" }); const j = await r.json().catch(() => ({}));
      if (!r.ok) return toast(j.error ?? "Could not unpublish.");
      setLive(null); setVersion(null); refreshShell();
      toast("Site unpublished");
    },
  });
  async function deleteProject() {
    setDeleting(true);
    const r = await fetch(`/api/projects/${project.id}`, { method: "DELETE" }); const j = await r.json().catch(() => ({}));
    if (!r.ok) { setDeleting(false); return toast(j.error ?? "Could not delete the project."); }
    refreshShell(); location.href = "/workspace";
  }

  const action = (provider: string) => `/api/connectors/${provider}/action`;
  const has = (p: string) => connected.includes(p);
  const github = () => setConfirmBox({
    title: settings.github_repo ? "Commit to GitHub?" : "Push to GitHub?", label: settings.github_repo ? "Commit" : "Push",
    extra: settings.github_repo ? undefined : "autocommit",
    body: settings.github_repo ? `All project files are sent as one commit to ${settings.github_repo}.`
      : `Oriel creates a private repository oriel-${project.slug} in your GitHub account and sends all files as the first commit.`,
    run: async () => { const j = await call(action("github"), { projectId: project.id, confirm: true, ...(settings.github_repo ? {} : { autocommit }) }, () => "Saved to GitHub"); if (j) refreshSettings(); },
  });
  const deploy = (provider: "vercel" | "netlify", label: string) => setConfirmBox({
    title: `Deploy to ${label}?`, label: "Deploy",
    body: `All project files are deployed as a static site to your ${label} account. ${project.slug}.${ROOT} is not affected.`,
    run: async () => { await call(action(provider), { projectId: project.id, confirm: true }, (j) => `Live at ${j.url}`); },
  });
  const supabaseList = async () => { const j = await call(action("supabase"), { op: "list" }, () => "Choose a Supabase project"); if (j) setSbProjects(j.projects ?? []); };
  const supabaseLink = async (ref: string) => { const j = await call(action("supabase"), { op: "link", projectId: project.id, ref }, (r) => `Linked to ${r.ref}`); if (j) { setSbProjects(null); refreshSettings(); } };
  const supabaseApply = () => setConfirmBox({
    title: "Apply schema to Supabase?", label: "Run SQL",
    body: `supabase/schema.sql runs on database ${settings.supabase_ref}. Review it in the Code tab first; database changes cannot be undone automatically.`,
    run: async () => { await call(action("supabase"), { projectId: project.id, confirm: true }, () => "Schema applied"); },
  });

  const docs = files.filter((f) => /\.(html|csv|md)$/.test(f));
  const tierRank = ["free", "builder", "pro", "studio"].indexOf(me?.tier ?? "free");
  const menu: MenuEntry[] = [
    { section: "Project" },
    ...(owner ? [{ icon: "pencil", label: "Rename", onSelect: () => setRename(project.name) } as MenuEntry, { icon: "user", label: "Share", onSelect: () => setShare(true) } as MenuEntry] : []),
    { icon: "history", label: "Version history", onSelect: openVersions },
    { icon: "download", label: "Download ZIP", onSelect: () => { location.href = `/api/projects/${project.id}/download`; } },
    ...(owner && live ? [
      { icon: "tag", label: "Sell as template", onSelect: () => setSell({ title: project.name, description: "", category: "landing", price: "50" }) } as MenuEntry,
      { icon: "spark", label: settings.showcase_opt_in ? "Remove from showcase" : "Allow in showcase", onSelect: toggleShowcase } as MenuEntry,
      { icon: "eye", label: "Unpublish", onSelect: unpublish } as MenuEntry,
    ] : []),
    "sep",
    { section: "Connectors" },
    has("github") ? { icon: "github", label: settings.github_repo ? "Commit to GitHub" : "Push to GitHub", hint: settings.github_autocommit ? "auto" : undefined, onSelect: github }
      : { icon: "github", label: tierRank >= 1 ? "Connect GitHub" : "GitHub (Builder plan)", onSelect: () => { location.href = "/connectors"; } },
    ...(has("vercel") ? [{ icon: "rocket", label: "Deploy to Vercel", onSelect: () => deploy("vercel", "Vercel") } as MenuEntry] : []),
    ...(has("netlify") ? [{ icon: "rocket", label: "Deploy to Netlify", onSelect: () => deploy("netlify", "Netlify") } as MenuEntry] : []),
    ...(has("google_drive") ? [{ icon: "cloud", label: "Save to Google Drive", onSelect: () => setDrivePick(docs.includes("index.html") ? "index.html" : docs[0] ?? ""), disabled: !docs.length } as MenuEntry] : []),
    ...(has("supabase") ? [settings.supabase_ref
      ? { icon: "database", label: "Apply Supabase schema", hint: settings.supabase_ref, onSelect: supabaseApply, disabled: !files.includes("supabase/schema.sql") } as MenuEntry
      : { icon: "database", label: "Use a Supabase database", onSelect: supabaseList } as MenuEntry] : []),
    { icon: "plug", label: "Manage connectors", onSelect: () => { location.href = "/connectors"; } },
    "sep",
    { icon: "trash", label: "Delete project", onSelect: () => setDel("") },
  ];
  // editors can chat, publish, restore versions and download; settings, connectors and deletion stay with the owner
  const items: MenuEntry[] = owner ? menu : menu.slice(0, 3);

  const lowCredit = me && me.balance?.total < 1;
  const current = codeFiles?.find((f) => f.path === openFile) ?? codeFiles?.[0];
  const lines = useMemo(() => (current && !current.content.startsWith("data:") ? current.content.split("\n").slice(0, 6000) : []), [current]);

  return (
    <div className="ws" data-pane={pane}>
      <div className="ws-mobile-tabs">
        <div className="seg" role="group" aria-label="View">
          <button aria-pressed={pane === "chat"} onClick={() => setPane("chat")}><Icon name="spark" />Chat</button>
          <button aria-pressed={pane === "preview"} onClick={() => setPane("preview")}><Icon name="eye" />Preview</button>
        </div>
      </div>

      {/* ---------------- chat ---------------- */}
      <section className="ws-chat" aria-label="Chat">
        <header className="ws-head">
          <div className="grow">
            <h1 className="ws-title truncate">{project.name}</h1>
            <div className="ws-sub row" style={{ gap: 6 }}>
              {live ? <><span className="dot dot-ok" /><a className="truncate" href={live} target="_blank" rel="noreferrer">{project.slug}.{ROOT}</a></>
                : <span className="truncate">{project.slug}.{ROOT} · draft</span>}
            </div>
          </div>
          <Menu label="Project actions" items={items} />
        </header>

        {(notice || lowCredit) && (
          <div className="ws-notices">
            {notice && (
              <div className={`callout ${notice.tone === "error" ? "callout-bad" : "callout-accent"}`} role={notice.tone === "error" ? "alert" : "status"}>
                <Icon name={notice.tone === "error" ? "alert" : "info"} />
                <div className="callout-body grow">
                  {notice.text}
                  {notice.items?.length ? <ul>{notice.items.map((i) => <li key={i}>{i}</li>)}</ul> : null}
                  {notice.tone === "error" && notice.items?.length ? <p className="small mute" style={{ marginTop: 6 }}>Ask the agent to remove these parts, then publish again.</p> : null}
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setNotice(null)} aria-label="Dismiss"><Icon name="x" /></button>
              </div>
            )}
            {lowCredit && (
              <div className="callout callout-accent">
                <Icon name="info" />
                <div className="callout-body grow">{me.profile?.wallet_verified_at ? "You're out of credits." : "Connect a wallet to unlock 60 free credits a month."}</div>
                <Link className="btn btn-sm" href={me.profile?.wallet_verified_at ? "/tiers" : "/account"}>{me.profile?.wallet_verified_at ? "Top up" : "Connect wallet"}</Link>
              </div>
            )}
          </div>
        )}

        <div className="ws-msgs" aria-live="polite">
          {msgs.length === 0 && (
            <div className="ws-start">
              <OrielMark size={28} />
              <h2 className="h2">What should this project be?</h2>
              <p className="mute small">Describe it in your own words: who it&apos;s for, what goes in it, and how it should feel.</p>
              <div className="stack" style={{ gap: 8 }}>
                {STARTERS.map((s) => <button key={s} type="button" className="chip" onClick={() => setInput(s)}>{s}</button>)}
              </div>
            </div>
          )}
          {msgs.map((m, i) => m.role === "user" ? (
            <div key={i} className="msg-user">
              {m.content}
              {!!m.attachments?.length && (
                <span className={ws.atts}>
                  {m.attachments.map((a) => <span key={a.path} className={ws.att} title={a.path}><Icon name={a.type.startsWith("image/") ? "image" : "file"} size={13} /><span className="truncate">{a.name}</span></span>)}
                </span>
              )}
            </div>
          ) : (
            <div key={i} className="msg-ai">
              <div className="mark"><OrielMark size={16} /></div>
              <div style={{ minWidth: 0 }}>
                {m.content ? (
                  <div className="prose" style={m.error ? { color: "var(--bad)" } : undefined}>{m.content}</div>
                ) : (
                  <div className="row small" style={{ color: "var(--ink-2)", minHeight: 26 }}>
                    <span className="spinner" /><span className="truncate">{status || "Thinking"}</span>
                  </div>
                )}
                {!m.content && steps.length > 0 && (
                  <details className="steps" open>
                    <summary><Icon name="chevronRight" className="chev" />{steps.length} step{steps.length === 1 ? "" : "s"}</summary>
                    <ol>{steps.map((s, k) => <li key={k} className={k === steps.length - 1 ? "now" : ""}>{s.text}</li>)}</ol>
                  </details>
                )}
                {m.content && m.steps && (
                  <details className="steps">
                    <summary><Icon name="chevronRight" className="chev" />{m.steps.length} step{m.steps.length === 1 ? "" : "s"}</summary>
                    <ol>{m.steps.map((s, k) => <li key={k}>{s.text}</li>)}</ol>
                  </details>
                )}
                {m.content && m.credits != null && (
                  <div className="msg-meta">
                    {m.action_kind && KIND[m.action_kind] && <span>{KIND[m.action_kind]}</span>}
                    {m.action_kind && KIND[m.action_kind] && <span>·</span>}
                    <span className="num">{m.credits} credit{m.credits === 1 ? "" : "s"}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="ws-input">
          <Composer value={input} onChange={setInput} onSubmit={() => send()} onStop={stopping ? undefined : stop}
            busy={busy} autoFocus={!initialPrompt} files={pending} onAttach={attach} onRemoveFile={unattach}
            placeholder={msgs.length ? "Ask for a change…" : "Describe what to build…"}
            footer={busy ? <span className="row"><span className="truncate">{stopping ? "Stopping after this step" : status}</span></span>
              : est && input.trim() ? <EstimateLabel est={est} />
              : <span className="num">{me ? `${(me.balance?.total ?? 0).toLocaleString("en-US")} credits` : ""}</span>} />
        </div>
      </section>

      {/* ---------------- preview ---------------- */}
      <section className="ws-preview" aria-label="Preview">
        <div className="pv-bar">
          <div className="seg" role="group" aria-label="Panel">
            <button aria-pressed={view === "preview"} onClick={() => setView("preview")}><Icon name="eye" /><span className="hide-mobile">Preview</span></button>
            <button aria-pressed={view === "code"} onClick={() => setView("code")}><Icon name="code" /><span className="hide-mobile">Code</span></button>
          </div>
          {view === "preview" && (
            <div className="seg hide-mobile" role="group" aria-label="Device">
              <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} aria-label="Desktop"><Icon name="monitor" /></button>
              <button aria-pressed={device === "tablet"} onClick={() => setDevice("tablet")} aria-label="Tablet"><Icon name="tablet" /></button>
              <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")} aria-label="Mobile"><Icon name="phone" /></button>
            </div>
          )}
          <div className="pv-url hide-mobile"><Icon name="globe" /><span className="truncate">{live ? `${project.slug}.${ROOT}` : "Draft preview"}</span>{version ? <button type="button" className={`badge ${ws.vbadge}`} onClick={openVersions} title="Version history">v{version}</button> : null}</div>
          <span className="grow only-mobile" />
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => (view === "code" ? loadCode() : setNonce((n) => n + 1))} aria-label="Reload"><Icon name="refresh" /></button>
          {(live || preview) && <a className="btn btn-ghost btn-icon btn-sm" href={live ?? preview} target="_blank" rel="noreferrer" aria-label="Open in new tab"><Icon name="external" /></a>}
          <button className="btn btn-accent btn-sm" onClick={publish} disabled={busy || publishing || !files.length}>
            {publishing ? <span className="spinner" /> : <Icon name="globe" />}{live ? "Update" : "Publish"}
          </button>
        </div>

        {view === "preview" ? (
          <div className="pv-stage">
            {files.length && preview ? (
              // sandbox without allow-same-origin + separate preview origin = user code cannot touch the Oriel session
              <iframe key={nonce} className="pv-frame" data-device={device} src={preview} sandbox="allow-scripts allow-forms allow-popups" title="Project preview" />
            ) : (
              <div className="pv-empty">
                <OrielMark size={40} />
                <p className="h3">Your preview appears here</p>
                <p className="small">As the agent writes files, the page updates live. Publish when you&apos;re happy with it.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="code">
            <div className="code-files" role="listbox" aria-label="Files">
              {codeFiles === null ? <div className="skel" style={{ height: 120 }} />
                : codeFiles.length === 0 ? <p className="small mute" style={{ padding: 8 }}>No files yet.</p>
                : codeFiles.map((f) => (
                  <button key={f.path} role="option" aria-selected={current?.path === f.path} className="code-file" onClick={() => setOpenFile(f.path)}>
                    <Icon name={f.content.startsWith("data:") ? "image" : "file"} /><span className="truncate">{f.path}</span>
                  </button>
                ))}
            </div>
            <div className="code-view">
              {current?.content.startsWith("data:")
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={current.content} alt={current.path} />
                : current ? <pre aria-label={current.path}>{lines.map((l, k) => <span key={k}>{l || " "}</span>)}</pre> : null}
            </div>
          </div>
        )}
      </section>

      {/* ---------------- dialogs ---------------- */}
      <Modal open={!!confirmBox} onClose={() => setConfirmBox(null)} title={confirmBox?.title ?? ""}
        footer={<>
          <button className="btn" onClick={() => setConfirmBox(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={async () => { const c = confirmBox!; setConfirmBox(null); await c.run(); }}>{confirmBox?.label}</button>
        </>}>
        <p>{confirmBox?.body}</p>
        {confirmBox?.extra === "autocommit" && <label className="check" style={{ color: "var(--ink)" }}><input type="checkbox" checked={autocommit} onChange={(e) => setAutocommit(e.target.checked)} />Commit automatically after every change</label>}
      </Modal>

      <Modal open={!!rename} onClose={() => setRename(null)} title="Rename project"
        footer={<><button className="btn" onClick={() => setRename(null)}>Cancel</button><button className="btn btn-primary" onClick={saveRename}>Save</button></>}>
        <input className="input" value={rename ?? ""} maxLength={80} onChange={(e) => setRename(e.target.value)} aria-label="Project name" autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") saveRename(); }} />
      </Modal>

      <Modal open={!!sell} onClose={() => setSell(null)} title="Sell as template"
        footer={<><button className="btn" onClick={() => setSell(null)}>Cancel</button><button className="btn btn-primary" onClick={submitTemplate} disabled={!sell?.title.trim()}>Publish template</button></>}>
        <p>The current published version is frozen as the template. You earn a royalty in USDG each time someone uses it.</p>
        {sell && <>
          <label className="field"><span className="label">Title</span><input className="input" value={sell.title} maxLength={60} onChange={(e) => setSell({ ...sell, title: e.target.value })} /></label>
          <label className="field"><span className="label">Description</span><textarea className="textarea" rows={3} maxLength={280} value={sell.description} onChange={(e) => setSell({ ...sell, description: e.target.value })} /></label>
          <div className="grid-2" style={{ gap: 12 }}>
            <label className="field"><span className="label">Category</span>
              <select className="select" value={sell.category} onChange={(e) => setSell({ ...sell, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}</select></label>
            <label className="field"><span className="label">Price (credits)</span><input className="input" inputMode="numeric" value={sell.price} onChange={(e) => setSell({ ...sell, price: e.target.value.replace(/\D/g, "") })} /></label>
          </div>
        </>}
      </Modal>

      <Modal open={drivePick !== null} onClose={() => setDrivePick(null)} title="Save to Google Drive"
        footer={<><button className="btn" onClick={() => setDrivePick(null)}>Cancel</button>
          <button className="btn btn-primary" disabled={!drivePick} onClick={async () => { const path = drivePick; setDrivePick(null); await call(action("google_drive"), { projectId: project.id, confirm: true, path }, () => "Saved to Drive"); }}>Save</button></>}>
        <p>The file is saved as a new document in your Drive. Oriel can only see files it created.</p>
        <select className="select" value={drivePick ?? ""} onChange={(e) => setDrivePick(e.target.value)} aria-label="File">{docs.map((d) => <option key={d}>{d}</option>)}</select>
      </Modal>

      <Modal open={!!sbProjects} onClose={() => setSbProjects(null)} title="Choose a Supabase project"
        footer={<button className="btn" onClick={() => setSbProjects(null)}>Cancel</button>}>
        <p>The site gets this project&apos;s public URL and anon key. Ask the agent to add forms or data, then apply the schema.</p>
        {sbProjects?.length === 0 && <p>No projects in your Supabase account yet. Create one at supabase.com first.</p>}
        <div className="stack" style={{ gap: 6 }}>
          {sbProjects?.map((p) => (
            <button key={p.ref} className="btn btn-block" style={{ justifyContent: "space-between" }} onClick={() => supabaseLink(p.ref)}>
              <span>{p.name}</span><span className="xs mute mono">{p.region}</span>
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={versions !== null} onClose={() => setVersions(null)} title="Version history"
        footer={<button className="btn" onClick={() => setVersions(null)}>Close</button>}>
        <p>Every publish is saved as a version. Restore one to put it back live and continue from it.</p>
        {versions === "loading" ? <div className="skel" style={{ height: 96 }} />
          : versions && versions.versions.length === 0 ? <div className="empty"><Icon name="history" /><span>No versions yet. Publish to create version 1.</span></div>
          : versions && (
            <div className={ws.versions}>
              {versions.versions.map((v) => (
                <div key={v.version} className={ws.version}>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, color: "var(--ink)" }}><b>Version {v.version}</b>{v.version === versions.live && <span className="badge badge-ok"><span className="dot dot-ok" />Live</span>}</div>
                    <div className="xs mute">{ago(v.created_at)} · {v.file_count} file{v.file_count === 1 ? "" : "s"} · {kb(v.bytes)}</div>
                  </div>
                  <button className="btn btn-sm" onClick={() => restore(v.version)} disabled={busy}>Restore</button>
                </div>
              ))}
            </div>
          )}
      </Modal>

      <Modal open={del !== null} onClose={() => !deleting && setDel(null)} title="Delete project"
        footer={<><button className="btn" onClick={() => setDel(null)} disabled={deleting}>Cancel</button>
          <button className="btn btn-danger" onClick={deleteProject} disabled={deleting || del?.trim() !== project.name.trim()}>
            {deleting ? <span className="spinner" /> : <Icon name="trash" />}Delete project</button></>}>
        <p>This deletes <b style={{ color: "var(--ink)" }}>{project.name}</b>: its files and chat, the site at {project.slug}.{ROOT}, and any custom domains. It cannot be undone. Templates you made from it stay available.</p>
        <label className="field"><span className="label">Type the project name to confirm</span>
          <input className="input" value={del ?? ""} onChange={(e) => setDel(e.target.value)} placeholder={project.name} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && del?.trim() === project.name.trim()) deleteProject(); }} /></label>
      </Modal>

      {owner && <ShareDialog projectId={project.id} open={share} onClose={() => setShare(false)} />}
      {toasts}
    </div>
  );
}
