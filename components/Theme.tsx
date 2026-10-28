"use client";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";

export type ThemePref = "system" | "light" | "dark";
const KEY = "oriel-theme";

/** Runs in <head> before paint so a saved choice never flashes the other theme. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`
  // data-motion gates scroll reveals: without JS, or with reduced motion, content is simply shown
  + `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.motion="1"}catch(e){}`;

export function getTheme(): ThemePref {
  try { const t = localStorage.getItem(KEY); return t === "light" || t === "dark" ? t : "system"; } catch { return "system"; }
}

export function setTheme(t: ThemePref) {
  try { t === "system" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, t); } catch { /* private mode: applies to this page only */ }
  const apply = () => {
    if (t === "system") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    window.dispatchEvent(new Event("oriel:theme"));
  };
  // cross-fade between themes where the browser supports view transitions
  const vt = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
  if (vt && document.documentElement.dataset.motion) vt.call(document, apply); else apply();
}

export function useTheme(): [ThemePref, (t: ThemePref) => void] {
  const [t, set] = useState<ThemePref>("system");
  useEffect(() => {
    set(getTheme());
    const f = () => set(getTheme());
    window.addEventListener("oriel:theme", f);
    return () => window.removeEventListener("oriel:theme", f);
  }, []);
  return [t, setTheme];
}

const OPTS: [ThemePref, IconName, string][] = [["system", "monitor", "System"], ["light", "sun", "Light"], ["dark", "moon", "Dark"]];

/** System / Light / Dark switch. `compact` shows icons only. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [t, set] = useTheme();
  return (
    <div className="seg" role="group" aria-label="Theme">
      {OPTS.map(([v, icon, label]) => (
        <button key={v} type="button" aria-pressed={t === v} onClick={() => set(v)} aria-label={`${label} theme`} title={`${label} theme`}>
          <Icon name={icon} />{!compact && label}
        </button>
      ))}
    </div>
  );
}
