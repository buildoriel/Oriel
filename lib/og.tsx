import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Share images (Open Graph / X cards), 1200×630, in the same light style as Oriel's announcement graphics:
 * a serif headline on the left and a small product panel on the right. Satori needs display:flex on every
 * element with more than one child, and static TTF fonts (the variable woff2 files can't be read).
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const INK = "#1D1C1A", MUTE = "#6F6B63", ACCENT = "#FF7A3D", ACCENT_D = "#E2601F", LINE = "rgba(29,28,26,0.10)";

function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <path d="M18 50a32 32 0 0 1 64 0h-16a16 16 0 0 0-32 0z" fill={INK} />
      <rect x="18" y="54" width="16" height="27" rx="3" fill={INK} />
      <rect x="66" y="54" width="16" height="27" rx="3" fill={INK} />
      <rect x="12" y="84" width="76" height="7" rx="3" fill={INK} />
      <rect x="45" y="44" width="10" height="34" rx="5" fill={ACCENT} />
    </svg>
  );
}

/** A white card for the right side. */
export function Panel({ children, width = 470 }: { children: React.ReactNode; width?: number }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", width, background: "#FFFFFF", border: `1px solid ${LINE}`, borderRadius: 24,
      padding: "24px 26px", boxShadow: "0 18px 50px rgba(28,26,23,0.10)",
    }}>{children}</div>
  );
}

export async function ogImage({ eyebrow, title, accent, sub, url, panel }: {
  eyebrow: string; title: string[]; accent?: string; sub: string; url: string; panel: React.ReactNode;
}) {
  const [serif, sans] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/og/SourceSerif4-Regular.ttf")),
    readFile(join(process.cwd(), "app/fonts/og/Inter-Medium.ttf")),
  ]);
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "Inter", color: INK,
        background: "#FAF8F4",
        backgroundImage: "radial-gradient(circle at 78% 50%, rgba(255,122,61,0.16), rgba(250,248,244,0) 45%)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 0 52px 64px", width: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Mark size={38} />
            <span style={{ fontSize: 30, letterSpacing: "-0.03em" }}>oriel</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, color: MUTE, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <span style={{ display: "flex", width: 8, height: 8, borderRadius: 4, background: ACCENT }} />{eyebrow}
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 18, fontFamily: "Source Serif", fontSize: 68, lineHeight: 1.04, letterSpacing: "-0.02em" }}>
              {title.map((line) => <span key={line}>{line}</span>)}
              {accent && <span style={{ color: ACCENT_D }}>{accent}</span>}
            </div>
            <span style={{ marginTop: 20, fontSize: 23, lineHeight: 1.45, color: MUTE, maxWidth: 520 }}>{sub}</span>
          </div>
          <div style={{ display: "flex" }}>
            <span style={{ display: "flex", padding: "10px 18px", borderRadius: 10, background: INK, color: "#FAF9F6", fontSize: 19 }}>{url}</span>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 56 }}>{panel}</div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Source Serif", data: serif, weight: 400, style: "normal" },
        { name: "Inter", data: sans, weight: 500, style: "normal" },
      ],
    },
  );
}
