import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Share image for every page that does not set its own. Static: rendered once at build time.
export const alt = "Oriel — Build anything. Own a piece of it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1D1C1A", ACCENT = "#FF7A3D";

export default async function OgImage() {
  // static TTF subsets of Source Serif 4 and Inter (Satori cannot read the variable woff2 files)
  const [serif, sans] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/og/SourceSerif4-Regular.ttf")),
    readFile(join(process.cwd(), "app/fonts/og/Inter-Medium.ttf")),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FAF9F6", padding: "72px 80px", fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg viewBox="0 0 100 100" width="64" height="64">
            <path d="M18 50a32 32 0 0 1 64 0h-16a16 16 0 0 0-32 0z" fill="#111317" />
            <rect x="18" y="54" width="16" height="27" rx="3" fill="#111317" />
            <rect x="66" y="54" width="16" height="27" rx="3" fill="#111317" />
            <rect x="12" y="84" width="76" height="7" rx="3" fill="#111317" />
            <rect x="45" y="44" width="10" height="34" rx="5" fill={ACCENT} />
          </svg>
          <span style={{ fontSize: 44, color: INK, letterSpacing: "-0.03em" }}>oriel</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Source Serif", fontSize: 92, lineHeight: 1.04, color: INK, letterSpacing: "-0.02em" }}>
            <span>Build anything.</span>
            <span>Own a piece of it.</span>
          </div>
          <span style={{ fontSize: 30, color: "#6B6862", maxWidth: 900, lineHeight: 1.4 }}>
            The AI workspace that builds and hosts your sites, designs, and documents.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, color: "#6B6862" }}>
          <span>buildoriel.com</span>
          <span style={{ display: "flex", width: 140, height: 6, borderRadius: 3, background: ACCENT }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Source Serif", data: serif, weight: 400, style: "normal" },
        { name: "Inter", data: sans, weight: 500, style: "normal" },
      ],
    },
  );
}
