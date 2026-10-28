/** Oriel icon (inline SVG). `dark` = white version for dark backgrounds. */
export function OrielIcon({ dark = false, size = 28 }: { dark?: boolean; size?: number }) {
  const fg = dark ? "#FFFFFF" : "#111317";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <path d="M18 50a32 32 0 0 1 64 0h-16a16 16 0 0 0-32 0z" fill={fg} />
      <rect x="18" y="54" width="16" height="27" rx="3" fill={fg} />
      <rect x="66" y="54" width="16" height="27" rx="3" fill={fg} />
      <rect x="12" y="84" width="76" height="7" rx="3" fill={fg} />
      <rect x="45" y="44" width="10" height="34" rx="5" fill="#FF7A3D" />
    </svg>
  );
}

/** Icon + wordmark. Both theme variants are rendered; CSS shows the one matching the color scheme. */
export function OrielLockup({ height = 26 }: { height?: number }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="light" src="/oriel-lockup-light.svg" alt="Oriel" style={{ height, width: "auto" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="dark" src="/oriel-lockup-dark.svg" alt="Oriel" style={{ height, width: "auto" }} />
    </>
  );
}

/** Small icon mark that follows the color scheme (used as the assistant avatar). */
export function OrielMark({ size = 16 }: { size?: number }) {
  return (
    <span className="oriel-mark" style={{ width: size, height: size, display: "inline-grid" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="light" src="/oriel-icon-light.svg" alt="" width={size} height={size} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="dark" src="/oriel-icon-dark.svg" alt="" width={size} height={size} />
    </span>
  );
}
