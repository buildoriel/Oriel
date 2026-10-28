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
export function OrielLockup({ height = 28 }: { height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/oriel-lockup-light.svg" alt="Oriel" style={{ height, width: "auto", display: "block" }} />;
}
