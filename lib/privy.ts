import { createRemoteJWKSet, importSPKI, jwtVerify, type JWTPayload } from "jose";

/**
 * Privy identity tokens (ES256 JWT, issuer privy.io, audience = Privy app id) carry the user's linked accounts.
 * Turn on "Return user data in an identity token" in the Privy dashboard. The key comes from Privy's JWKS,
 * or from PRIVY_VERIFICATION_KEY (the PEM shown in the dashboard) when set.
 */
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

type Linked = { type?: string; address?: string; email?: string; chain_type?: string; wallet_client_type?: string; connector_type?: string };
export type PrivyIdentity = { did: string; email: string | null; wallet: string | null; embeddedWallet: boolean };

async function verify(token: string) {
  const opts = { issuer: "privy.io", audience: APP_ID, algorithms: ["ES256"] };
  const pem = process.env.PRIVY_VERIFICATION_KEY;
  if (pem) return (await jwtVerify(token, await importSPKI(pem.replace(/\\n/g, "\n"), "ES256"), opts)).payload;
  jwks ??= createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${APP_ID}/jwks.json`));
  return (await jwtVerify(token, jwks, opts)).payload;
}

/** Pure: picks the email and the Ethereum wallet from the token claims. External wallets win over Privy's embedded one. */
export function identityFromClaims(p: JWTPayload & { linked_accounts?: unknown }): PrivyIdentity {
  if (typeof p.sub !== "string" || !p.sub.startsWith("did:privy:")) throw new Error("Invalid Privy user id.");
  let accounts: Linked[] = [];
  try { accounts = typeof p.linked_accounts === "string" ? JSON.parse(p.linked_accounts) : (p.linked_accounts as Linked[]) ?? []; } catch { accounts = []; }
  if (!Array.isArray(accounts)) accounts = [];
  const email = accounts.find((a) => a.type === "email" && a.address)?.address
    ?? accounts.find((a) => a.type?.endsWith("_oauth") && a.email)?.email ?? null;
  const evm = accounts.filter((a) => a.type === "wallet" && /^0x[0-9a-fA-F]{40}$/.test(a.address ?? "") && (a.chain_type ?? "ethereum") === "ethereum");
  const ext = evm.find((a) => a.wallet_client_type !== "privy" && a.connector_type !== "embedded");
  const w = ext ?? evm[0];
  return { did: p.sub, email: email?.trim().toLowerCase() ?? null, wallet: w?.address?.toLowerCase() ?? null, embeddedWallet: !!w && !ext };
}

export async function verifyPrivyIdentity(token: string): Promise<PrivyIdentity> {
  if (!APP_ID) throw new Error("Privy is not configured (NEXT_PUBLIC_PRIVY_APP_ID).");
  return identityFromClaims(await verify(token));
}
