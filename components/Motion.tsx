"use client";
import { useEffect, useRef, useState } from "react";

/** True when the visitor allows motion (set before paint by THEME_SCRIPT). */
export const motionOk = () => typeof document !== "undefined" && !!document.documentElement.dataset.motion;

/**
 * Marks every [data-reveal] element with data-in once it scrolls into view, so CSS can fade it up.
 * Mount once per page. Elements stay visible without JS or with reduced motion (see globals.css).
 */
export function RevealObserver() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-in])"));
    if (!motionOk() || !("IntersectionObserver" in window)) { els.forEach((e) => (e.dataset.in = "")); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { (e.target as HTMLElement).dataset.in = ""; io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return null;
}

/** Runs `cb` once, the first time `ref` is on screen (immediately without IntersectionObserver). */
export function useOnScreen(ref: React.RefObject<Element | null>, cb: () => void) {
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    if (!("IntersectionObserver" in window)) { done.current = true; cb(); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) { done.current = true; cb(); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A number that rolls to its new value. With `onView`, it counts up from 0 the first time it is seen;
 * otherwise it rolls whenever `value` changes. Server render and reduced motion show the final value.
 */
export function CountUp({ value, prefix = "", duration = 700, onView = false, className }:
  { value: number; prefix?: string; duration?: number; onView?: boolean; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const ref = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

  const run = (start: number, end: number) => {
    cancelAnimationFrame(frame.current);
    if (!motionOk() || start === end) { setShown(end); from.current = end; return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const v = start + (end - start) * easeOut(p);
      setShown(v); from.current = v;
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  // count up from zero when first seen
  const armed = useRef(onView);
  useEffect(() => { if (onView && motionOk()) { setShown(0); from.current = 0; } }, [onView]);
  useOnScreen(ref, () => { if (armed.current) { armed.current = false; run(0, value); } });

  // roll on later changes
  useEffect(() => {
    if (armed.current) return;
    run(from.current, value);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span ref={ref} className={className}>{prefix}{Math.round(shown).toLocaleString("en-US")}</span>;
}
