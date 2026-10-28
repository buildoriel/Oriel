import { ogImage, Panel, INK, MUTE, LINE, ACCENT_D } from "@/lib/og";

export const alt = "Oriel pricing — pay for a plan, or stake $ORIEL instead";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const T: [string, string, string, string][] = [
  ["Free", "$0", "60 credits", ""], ["Builder", "$20", "1,000 credits", "or stake $200"],
  ["Pro", "$50", "2,500 credits", "or stake $500"], ["Studio", "$200", "10,000 credits", "or stake $2,000"],
];

export default function OgImage() {
  return ogImage({
    eyebrow: "Pricing", title: ["Pay for a plan,"], accent: "or stake it.",
    sub: "Start free. Upgrade with USDG, or stake $ORIEL worth the plan and keep your tokens.", url: "buildoriel.com/tiers",
    panel: (
      <Panel>
        {T.map(([name, price, credits, stake], i) => (
          <div key={name} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderTop: i ? `1px solid ${LINE}` : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", width: 190 }}>
              <span style={{ fontSize: 20, color: INK }}>{name}</span>
              <span style={{ fontSize: 15, color: MUTE }}>{credits} / month</span>
            </div>
            <span style={{ display: "flex", fontFamily: "Source Serif", fontSize: 32, color: INK, width: 100 }}>{price}</span>
            <span style={{ display: "flex", fontSize: 15, color: ACCENT_D }}>{stake}</span>
          </div>
        ))}
      </Panel>
    ),
  });
}
