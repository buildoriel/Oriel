import { ogImage, Panel, INK, MUTE } from "@/lib/og";

// Share image for every page that does not set its own. Static: rendered once at build time.
export const alt = "Oriel — Build anything. Own a piece of it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STEPS = ["Planning the layout", "Writing the page", "Adding the menu", "Checking it on mobile"];

export default function OgImage() {
  return ogImage({
    eyebrow: "AI workspace on Robinhood Chain", title: ["Build anything."], accent: "Own a piece of it.",
    sub: "Describe it in a sentence. Oriel builds it and puts it live at a link.", url: "buildoriel.com",
    panel: (
      <Panel>
        <div style={{ display: "flex", padding: "14px 16px", borderRadius: 14, background: "#F3EFE9", fontSize: 19, lineHeight: 1.4, color: INK }}>
          A landing page for my coffee roastery, warm and simple, with our menu and hours.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          {STEPS.map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, color: MUTE }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D4F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>{s}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, padding: "12px 16px", borderRadius: 12, background: INK, color: "#FAF9F6", fontSize: 17 }}>
          <span style={{ display: "flex", width: 9, height: 9, borderRadius: 5, background: "#6BC28E" }} />Live at ember-oak.buildoriel.com
        </div>
      </Panel>
    ),
  });
}
