/** Shared layout for the Privacy Policy and Terms pages. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "support@buildoriel.com";
export const LEGAL_UPDATED = "October 28, 2026";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="page legal">
      <h2>{title}</h2>
      <p className="mono mute" style={{ marginTop: 12 }}>Last updated {LEGAL_UPDATED}</p>
      <div className="legal-body">{children}</div>
    </section>
  );
}
