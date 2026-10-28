import Link from "next/link";
import { OrielMark } from "./Logo";
import { ThemeToggle } from "./Theme";

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
        <div className="row small mute" style={{ gap: 14 }}><span className="row"><OrielMark size={18} /><span>© {new Date().getFullYear()} Oriel</span></span><ThemeToggle compact /></div>
        <nav aria-label="Help, legal and community">
          <Link href="/docs">Docs</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/changelog">Changelog</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/report">Report a site</Link>
          {SOCIAL.filter(([, href]) => href).map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>)}
        </nav>
      </div>
    </footer>
  );
}
