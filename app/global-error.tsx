"use client";
import { useEffect } from "react";

// Replaces the root layout when it fails, so globals.css and fonts may be missing: inline styles only.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const body = JSON.stringify({ message: error.message || "Root layout error", stack: error.stack, digest: error.digest, url: location.href });
    fetch("/api/errors", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#FAF9F6", color: "#1D1C1A", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Arial, sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <svg viewBox="0 0 100 100" width="40" height="40" aria-hidden="true">
            <path d="M18 50a32 32 0 0 1 64 0h-16a16 16 0 0 0-32 0z" fill="#111317" /><rect x="18" y="54" width="16" height="27" rx="3" fill="#111317" />
            <rect x="66" y="54" width="16" height="27" rx="3" fill="#111317" /><rect x="12" y="84" width="76" height="7" rx="3" fill="#111317" />
            <rect x="45" y="44" width="10" height="34" rx="5" fill="#FF7A3D" />
          </svg>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 36, margin: "16px 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#6B6862", lineHeight: 1.6, margin: "0 0 20px" }}>We&rsquo;ve logged the problem. Your projects and credits are safe.</p>
          <button type="button" onClick={reset} style={{ font: "inherit", fontWeight: 500, background: "#1D1C1A", color: "#FAF9F6", border: 0, borderRadius: 9, padding: "10px 16px", cursor: "pointer" }}>Try again</button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ marginLeft: 12, color: "#1D1C1A" }}>Go home</a>
        </div>
      </body>
    </html>
  );
}
