import { ogImage, Panel, INK, MUTE, LINE } from "@/lib/og";

export const alt = "Oriel templates — free projects to start from";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const T: [string, string][] = [
  ["Sora Ceramics", "Online store"], ["Lumen", "Finance dashboard"], ["Halden Studio", "Portfolio"],
  ["Meridian 2027", "Conference site"], ["Tideline", "Pitch deck"],
];

export default function OgImage() {
  return ogImage({
    eyebrow: "Templates", title: ["Start from"], accent: "something real.",
    sub: "Free, complete projects. Pick one, change it by chatting, and publish it at your own link.", url: "buildoriel.com/templates",
    panel: (
      <Panel>
        {T.map(([name, kind], i) => (
          <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderTop: i ? `1px solid ${LINE}` : "none" }}>
            <span style={{ fontSize: 21, color: INK }}>{name}</span>
            <span style={{ display: "flex", fontSize: 15, color: MUTE, background: "#F3EFE9", padding: "5px 11px", borderRadius: 999 }}>{kind}</span>
          </div>
        ))}
        <div style={{ display: "flex", marginTop: 10, fontSize: 15, color: "#2E7D4F" }}>All free</div>
      </Panel>
    ),
  });
}
