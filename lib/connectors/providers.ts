import type { TierId } from "../config";

export type ProviderId = "github" | "vercel" | "netlify" | "supabase" | "google_drive" | "cloudflare";
type OAuthProvider = {
  label: string; authUrl: string; tokenUrl: string; scopes: string; clientIdEnv: string; clientSecretEnv: string;
  extraAuthParams?: Record<string, string>; tokenAuth?: "body" | "basic";
};

/**
 * Izin seminimal mungkin:
 *  - GitHub: GitHub App (bukan OAuth App) dengan izin Contents: read/write + Administration: write
 *    HANYA untuk repo yang dipilih/dibuat. Disarankan install dengan "Only select repositories".
 *  - Google Drive: drive.file -> hanya file yang dibuat Oriel.
 *  - Cloudflare: tidak ada OAuth publik untuk integrasi umum; user menempel API Token
 *    berizin "Zone:DNS:Edit" untuk zona tertentu saja.
 */
export const OAUTH: Record<Exclude<ProviderId, "cloudflare">, OAuthProvider> = {
  github: {
    label: "GitHub", authUrl: "https://github.com/login/oauth/authorize", tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: "", clientIdEnv: "GITHUB_APP_CLIENT_ID", clientSecretEnv: "GITHUB_APP_CLIENT_SECRET",
  },
  vercel: {
    label: "Vercel", authUrl: `https://vercel.com/integrations/${process.env.VERCEL_INTEGRATION_SLUG ?? "oriel"}/new`,
    tokenUrl: "https://api.vercel.com/v2/oauth/access_token", scopes: "",
    clientIdEnv: "VERCEL_CLIENT_ID", clientSecretEnv: "VERCEL_CLIENT_SECRET",
  },
  netlify: {
    label: "Netlify", authUrl: "https://app.netlify.com/authorize", tokenUrl: "https://api.netlify.com/oauth/token",
    scopes: "", clientIdEnv: "NETLIFY_CLIENT_ID", clientSecretEnv: "NETLIFY_CLIENT_SECRET",
  },
  supabase: {
    label: "Supabase", authUrl: "https://api.supabase.com/v1/oauth/authorize", tokenUrl: "https://api.supabase.com/v1/oauth/token",
    scopes: "", clientIdEnv: "SUPABASE_OAUTH_CLIENT_ID", clientSecretEnv: "SUPABASE_OAUTH_CLIENT_SECRET", tokenAuth: "basic",
  },
  google_drive: {
    label: "Google Drive", authUrl: "https://accounts.google.com/o/oauth2/v2/auth", tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: "https://www.googleapis.com/auth/drive.file", clientIdEnv: "GOOGLE_CLIENT_ID", clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
};

export const MIN_TIER: Record<ProviderId, TierId> = {
  github: "builder", vercel: "pro", netlify: "pro", supabase: "pro", google_drive: "pro", cloudflare: "studio",
};

export const redirectUri = (p: ProviderId) => `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/${p}/callback`;
