import { ogImage, Panel, INK, MUTE, LINE } from "@/lib/og";

export const alt = "$ORIEL — official token and contract addresses, with live on-chain data";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const short = (a?: string) => (a && a.length > 20 ? `${a.slice(0, 8)}…${a.slice(-6)}` : "—");

export default function OgImage() {
  const rows: [string, string | undefined][] = [
    ["$ORIEL token", process.env.ORIEL_TOKEN_ADDRESS],
    ["Staking", process.env.STAKING_CONTRACT_ADDRESS],
    ["Revenue share", process.env.REVSHARE_DISTRIBUTOR_ADDRESS],
  ];
  return ogImage({
    eyebrow: "$ORIEL", title: ["Everything about", "$ORIEL,"], accent: "in one place.",
    sub: "The official addresses, with live supply, burn and staking data from Robinhood Chain.", url: "buildoriel.com/token",
    panel: (
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 19, color: INK }}>
          <span>Official contracts</span>
          <span style={{ display: "flex", fontSize: 14, color: MUTE, background: "#F1ECE5", padding: "5px 10px", borderRadius: 999 }}>Robinhood Chain</span>
        </div>
        {rows.map(([label, a]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "14px 0", borderTop: `1px solid ${LINE}`, marginTop: 12 }}>
            <span style={{ fontSize: 16, color: MUTE }}>{label}</span>
            <span style={{ fontSize: 22, color: INK, letterSpacing: "0.01em" }}>{short(a)}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, fontSize: 16, color: MUTE }}>
          <span style={{ display: "flex", width: 9, height: 9, borderRadius: 5, background: "#2E7D4F" }} />No owner, no pause on staking
        </div>
      </Panel>
    ),
  });
}
