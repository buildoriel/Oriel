"use client";
import { useEffect } from "react";

const sent = new Set<string>();
let count = 0;
const MAX_PER_PAGE = 5;

/** Send a client error to /api/errors. Deduplicated and capped at 5 per page load. */
export function reportClientError(e: { message: string; stack?: string; digest?: string }) {
  const key = `${e.message}|${e.digest ?? ""}`;
  if (!e.message || sent.has(key) || count >= MAX_PER_PAGE) return;
  sent.add(key); count++;
  const body = JSON.stringify({ message: e.message.slice(0, 1000), stack: e.stack?.slice(0, 8000), digest: e.digest, url: location.href });
  try {
    if (!navigator.sendBeacon?.("/api/errors", new Blob([body], { type: "application/json" })))
      fetch("/api/errors", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  } catch { /* never let reporting throw */ }
}

/** Mounted once in the root layout: catches uncaught errors and unhandled promise rejections. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (ev: ErrorEvent) => {
      // ignore noise from browser extensions and cross-origin scripts
      if (!ev.message || ev.message === "Script error." || /^(chrome|moz|safari)-extension:/.test(ev.filename ?? "")) return;
      reportClientError({ message: ev.message, stack: ev.error?.stack });
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      const r = ev.reason;
      reportClientError({ message: r instanceof Error ? r.message : String(r ?? "Unhandled rejection"), stack: r instanceof Error ? r.stack : undefined });
    };
    addEventListener("error", onError); addEventListener("unhandledrejection", onRejection);
    return () => { removeEventListener("error", onError); removeEventListener("unhandledrejection", onRejection); };
  }, []);
  return null;
}
