/** Accounts without an email (wallet-only sign-in) get a placeholder address that never receives mail. */
export const PLACEHOLDER_EMAIL_DOMAIN = "users.buildoriel.com";
export const placeholderEmail = (did: string) => `${did.replace(/^did:privy:/, "").toLowerCase()}@${PLACEHOLDER_EMAIL_DOMAIN}`;
export const isPlaceholderEmail = (e?: string | null) => !!e && e.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);

/** How an account is named in messages and UI: the real email, else the user id. */
export const accountLabel = (u: { id: string; email?: string | null }) => (u.email && !isPlaceholderEmail(u.email) ? u.email : u.id);
