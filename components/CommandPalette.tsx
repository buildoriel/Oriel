"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { setTheme } from "./Theme";

type Project = { id: string; name: string; slug: string; shared?: boolean };
type Item = { id: string; group: string; icon: IconName; label: string; hint?: string; run: () => void };

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const modKey = () => (isMac() ? "⌘" : "Ctrl");

const SHORTCUTS: [string[], string][] = [
  [["mod", "K"], "Search projects and commands"],
  [["mod", "Shift", "O"], "New project"],
  [["mod", "B"], "Toggle sidebar on small screens"],
  [["Enter"], "Send message"],
  [["Shift", "Enter"], "New line in a message"],
  [["?"], "Show keyboard shortcuts"],
  [["Esc"], "Close dialogs and menus"],
];

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** Cmd/Ctrl+K palette plus the app-wide keyboard shortcuts. Mounted once by AppShell. */
export function CommandPalette({ projects, onToggleSidebar }: { projects: Project[]; onToggleSidebar: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const dlg = useRef<HTMLDialogElement>(null);
  const helpDlg = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "k") { e.preventDefault(); setHelp(false); setOpen((o) => !o); }
      else if (mod && e.shiftKey && k === "o") { e.preventDefault(); router.push("/workspace"); }
      else if (mod && k === "b" && !typing(e.target)) { e.preventDefault(); onToggleSidebar(); }
      else if (e.key === "?" && !mod && !typing(e.target)) { e.preventDefault(); setOpen(false); setHelp(true); }
    };
    const openPalette = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("oriel:palette", openPalette);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("oriel:palette", openPalette); };
  }, [router, onToggleSidebar]);

  useEffect(() => { const d = dlg.current; if (!d) return; if (open && !d.open) { setQ(""); setSel(0); d.showModal(); } if (!open && d.open) d.close(); }, [open]);
  useEffect(() => { const d = helpDlg.current; if (!d) return; if (help && !d.open) d.showModal(); if (!help && d.open) d.close(); }, [help]);

  const go = (href: string) => () => router.push(href);
  const items = useMemo<Item[]>(() => {
    const all: Item[] = [
      ...projects.map((p) => ({ id: `p-${p.id}`, group: "Projects", icon: (p.shared ? "user" : "folder") as IconName, label: p.name, hint: p.shared ? "Shared" : p.slug, run: go(`/workspace/${p.id}`) })),
      { id: "new", group: "Actions", icon: "plus", label: "New project", hint: `${modKey()} Shift O`, run: go("/workspace") },
      { id: "templates", group: "Go to", icon: "templates", label: "Templates", run: go("/templates") },
      { id: "connectors", group: "Go to", icon: "plug", label: "Connectors & domains", run: go("/connectors") },
      { id: "stake", group: "Go to", icon: "layers", label: "Stake", run: go("/stake") },
      { id: "tiers", group: "Go to", icon: "card", label: "Plans & credits", run: go("/tiers") },
      { id: "account", group: "Go to", icon: "user", label: "Account", run: go("/account") },
      { id: "docs", group: "Go to", icon: "book", label: "Docs", run: go("/docs") },
      { id: "t-system", group: "Theme", icon: "monitor", label: "Use system theme", run: () => setTheme("system") },
      { id: "t-light", group: "Theme", icon: "sun", label: "Light theme", run: () => setTheme("light") },
      { id: "t-dark", group: "Theme", icon: "moon", label: "Dark theme", run: () => setTheme("dark") },
      { id: "keys", group: "Help", icon: "keyboard", label: "Keyboard shortcuts", hint: "?", run: () => setHelp(true) },
    ];
    const s = q.trim().toLowerCase();
    if (!s) return all.filter((i) => i.group !== "Projects" || all.indexOf(i) < 8);
    return all.filter((i) => `${i.label} ${i.hint ?? ""} ${i.group}`.toLowerCase().includes(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, q]);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" }); }, [sel]);

  const run = (i?: Item) => { if (!i) return; setOpen(false); i.run(); };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); run(items[sel]); }
  };

  let lastGroup = "";
  return (
    <>
      <dialog ref={dlg} className="modal cmdk" onClose={() => setOpen(false)} aria-label="Command palette"
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
        {open && <>
          <div className="cmdk-input">
            <Icon name="search" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
              placeholder="Search projects and commands" aria-label="Search projects and commands"
              role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-activedescendant={items[sel] ? `cmdk-${items[sel].id}` : undefined} />
            <span className="kbd">Esc</span>
          </div>
          <div className="cmdk-list" id="cmdk-list" role="listbox" ref={list}>
            {items.length === 0 && <p className="small mute" style={{ padding: "18px 14px" }}>No results for “{q}”.</p>}
            {items.map((it, i) => {
              const head = it.group !== lastGroup ? (lastGroup = it.group) : null;
              return (
                <div key={it.id}>
                  {head && <div className="menu-label">{head}</div>}
                  <button type="button" id={`cmdk-${it.id}`} role="option" aria-selected={i === sel} data-i={i}
                    className="cmdk-item" onMouseMove={() => setSel(i)} onClick={() => run(it)}>
                    <Icon name={it.icon} /><span className="grow truncate">{it.label}</span>
                    {it.hint && <span className="xs faint truncate" style={{ maxWidth: 160 }}>{it.hint}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </>}
      </dialog>

      <dialog ref={helpDlg} className="modal" onClose={() => setHelp(false)} aria-labelledby="keys-title"
        onClick={(e) => { if (e.target === e.currentTarget) setHelp(false); }}>
        {help && <>
          <div className="modal-body">
            <h2 id="keys-title" className="h3" style={{ fontSize: 17, marginBottom: 12 }}>Keyboard shortcuts</h2>
            <div className="stack" style={{ gap: 0 }}>
              {SHORTCUTS.map(([keys, label]) => (
                <div key={label} className="row-between small" style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="mute">{label}</span>
                  <span className="row" style={{ gap: 4 }}>{keys.map((k) => <span key={k} className="kbd">{k === "mod" ? modKey() : k}</span>)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-foot"><button className="btn" onClick={() => setHelp(false)}>Close</button></div>
        </>}
      </dialog>
    </>
  );
}
