"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { ACCEPT, MAX_ATTACHMENTS } from "@/lib/uploads";
import s from "./ui.module.css";

/** A file picked for the next message. `url` is an object URL for image thumbnails. */
export type PendingFile = { file: File; url?: string; error?: string };

const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Prompt box with auto-growing textarea. Enter sends, Shift+Enter adds a line.
 * With onAttach, files can be added with the + button, by drag and drop, or by pasting images.
 */
export function Composer({
  value, onChange, onSubmit, onStop, busy = false, placeholder, autoFocus, footer, maxLength = 8000, label = "Message",
  files, onAttach, onRemoveFile,
}: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; onStop?: () => void;
  busy?: boolean; placeholder?: string; autoFocus?: boolean; footer?: React.ReactNode; maxLength?: number; label?: string;
  files?: PendingFile[]; onAttach?: (files: File[]) => void; onRemoveFile?: (i: number) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const pick = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  useLayoutEffect(() => {
    const t = ref.current; if (!t) return;
    t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 280)}px`;
  }, [value]);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  const full = (files?.length ?? 0) >= MAX_ATTACHMENTS;
  const canSend = (!!value.trim() || !!files?.length) && !busy && !files?.some((f) => f.error);
  const drop = onAttach ? {
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) onAttach([...e.dataTransfer.files]); },
  } : {};
  return (
    <form className={`composer${drag ? ` ${s.drop}` : ""}`} onSubmit={(e) => { e.preventDefault(); if (canSend) onSubmit(); }} {...drop}>
      {!!files?.length && (
        <div className={s.files} aria-label="Attached files">
          {files.map((f, i) => (
            <div key={i} className={s.file} data-state={f.error ? "error" : undefined} title={f.error ?? f.file.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.url ? <img className={s.thumb} src={f.url} alt="" /> : <span className={s.thumb}><Icon name={f.error ? "alert" : "file"} /></span>}
              <span className={s.meta}><span className="truncate">{f.file.name}</span><span className="truncate">{f.error ?? size(f.file.size)}</span></span>
              {onRemoveFile && <button type="button" className={s.remove} onClick={() => onRemoveFile(i)} aria-label={`Remove ${f.file.name}`}><Icon name="x" /></button>}
            </div>
          ))}
        </div>
      )}
      <textarea ref={ref} rows={1} value={value} maxLength={maxLength} aria-label={label} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onAttach ? (e) => { const f = [...e.clipboardData.files]; if (f.length) { e.preventDefault(); onAttach(f); } } : undefined}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (canSend) onSubmit(); } }} />
      <div className="composer-foot">
        {onAttach && <>
          <button type="button" className={s.attach} onClick={() => pick.current?.click()} disabled={busy || full}
            aria-label="Attach files" title={full ? `Up to ${MAX_ATTACHMENTS} files per message` : "Attach images or text files"}><Icon name="paperclip" /></button>
          <input ref={pick} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { if (e.target.files?.length) onAttach([...e.target.files]); e.target.value = ""; }} />
        </>}
        <div className="row small mute grow">{footer}</div>
        {busy && onStop
          ? <button type="button" className="send stop" onClick={onStop} aria-label="Stop"><Icon name="stop" /></button>
          : <button type="submit" className="send" disabled={!canSend} aria-label="Send"><Icon name="arrowUp" /></button>}
      </div>
    </form>
  );
}

export type MenuEntry = { icon?: IconName; label: string; onSelect: () => void; disabled?: boolean; hint?: string } | "sep" | { section: string };

/** Button that opens a small action menu. Closes on outside click, Escape, or selection. */
export function Menu({ label, icon = "more", items, align = "right", buttonClass = "btn btn-ghost btn-icon btn-sm" }: {
  label: string; icon?: IconName; items: MenuEntry[]; align?: "left" | "right"; buttonClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={box} style={{ position: "relative" }}>
      <button type="button" className={buttonClass} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name={icon} />
      </button>
      {open && (
        <div className="menu" role="menu" style={{ top: "calc(100% + 6px)", [align]: 0 }}>
          {items.map((it, i) => it === "sep" ? <div key={i} className="menu-sep" />
            : "section" in it ? <div key={i} className="menu-label">{it.section}</div>
            : (
              <button key={i} type="button" role="menuitem" className="menu-item" aria-disabled={it.disabled || undefined}
                onClick={() => { setOpen(false); it.onSelect(); }}>
                {it.icon && <Icon name={it.icon} />}<span className="grow">{it.label}</span>
                {it.hint && <span className="xs faint">{it.hint}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/** Native <dialog> modal. Rendered only while open. */
export function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-labelledby="modal-title">
      {open && <>
        <div className="modal-body">
          <h2 id="modal-title" className="h3" style={{ fontSize: 17, marginBottom: 10 }}>{title}</h2>
          <div className="small mute stack" style={{ fontSize: 14 }}>{children}</div>
        </div>
        <div className="modal-foot">{footer}</div>
      </>}
    </dialog>
  );
}

/** Tiny toast queue. Returns [node, show]. */
export function useToasts(): [React.ReactNode, (text: string) => void] {
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);
  const show = (text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.slice(-2), { id, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4200);
  };
  const node = <div className="toast-stack" role="status" aria-live="polite">{items.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>;
  return [node, show];
}

export type Estimate = { kind: string; model: string; low: number; high: number };
const MODEL_NAME: Record<string, string> = {
  "claude-haiku-5-5": "Haiku 5.5", "claude-sonnet-5-5": "Sonnet 5.5", "claude-opus-5-5": "Opus 5.5", "claude-fable-5-1": "Fable 5.1",
};

/** Rough credit estimate for a draft message (debounced; null while typing, signed out, or for very short text). */
export function useEstimate(text: string, projectId?: string) {
  const [est, setEst] = useState<Estimate | null>(null);
  useEffect(() => {
    const message = text.trim();
    if (message.length < 8) { setEst(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch("/api/estimate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, projectId }), signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null)).then(setEst).catch(() => {});
    }, 600);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [text, projectId]);
  return est;
}

export function EstimateLabel({ est }: { est: Estimate }) {
  const range = est.low === est.high ? `${est.low}` : `${est.low.toLocaleString("en-US")}–${est.high.toLocaleString("en-US")}`;
  return (
    <span className={s.estimate} title="Estimate based on similar requests. You are charged for actual usage, never more than the request's limit.">
      <Icon name="spark" size={13} />≈ {range} credits · {MODEL_NAME[est.model] ?? est.model}
    </span>
  );
}
