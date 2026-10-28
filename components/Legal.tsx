/** Shared layout for the Privacy Policy and Terms pages. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "support@buildoriel.com";
export const LEGAL_UPDATED = "October 28, 2026";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="site-main">
      <article className="page page-narrow">
        <span className="eyebrow">Legal</span>
        <h1 className="h1" style={{ marginTop: 12 }}>{title}</h1>
        <p className="small mute" style={{ marginTop: 10 }}>Last updated {LEGAL_UPDATED}</p>
        <div className="legal-body">{children}</div>
      </article>
    </div>
  );
}
