"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";

/** Prompt box with auto-growing textarea. Enter sends, Shift+Enter adds a line. */
export function Composer({
  value, onChange, onSubmit, onStop, busy = false, placeholder, autoFocus, footer, maxLength = 8000, label = "Message",
}: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; onStop?: () => void;
  busy?: boolean; placeholder?: string; autoFocus?: boolean; footer?: React.ReactNode; maxLength?: number; label?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const t = ref.current; if (!t) return;
    t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 280)}px`;
  }, [value]);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  const canSend = !!value.trim() && !busy;
  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); if (canSend) onSubmit(); }}>
      <textarea ref={ref} rows={1} value={value} maxLength={maxLength} aria-label={label} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (canSend) onSubmit(); } }} />
      <div className="composer-foot">
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
