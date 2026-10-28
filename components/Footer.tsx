import Link from "next/link";

const SOCIAL: [string, string | undefined][] = [
  ["X", "https://x.com/buildoriel"],
  ["GitHub", "https://github.com/buildoriel"],
  ["Telegram", "https://t.me/buildoriel"],
  ["Discord", process.env.NEXT_PUBLIC_DISCORD_URL], // shown only once an invite link is set
];

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot-in">
        <span className="mono mute">© {new Date().getFullYear()} Oriel. Build anything. Own a piece of it.</span>
        <nav aria-label="Legal and community">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/report">Report a site</Link>
          {SOCIAL.filter(([, href]) => href).map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>)}
        </nav>
      </div>
    </footer>
  );
}
