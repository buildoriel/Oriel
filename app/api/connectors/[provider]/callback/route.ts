import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { OAUTH, redirectUri, type ProviderId } from "@/lib/connectors/providers";
import { encrypt } from "@/lib/connectors/crypto";
import { handle } from "@/lib/http";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ provider: string }> }) => {
  const user = await requireUser();
  const provider = (await ctx.params).provider as Exclude<ProviderId, "cloudflare">;
  const cfg = OAUTH[provider];
  if (!cfg) throw new HttpError(404, "Konektor tidak dikenal.");
  const url = new URL(req.url);
  const jar = await cookies();
  if (!url.searchParams.get("state") || url.searchParams.get("state") !== jar.get(`oauth_${provider}`)?.value)
    throw new HttpError(400, "Sesi sambungan tidak valid. Ulangi dari halaman Connectors.");
  jar.delete(`oauth_${provider}`);

  const id = process.env[cfg.clientIdEnv]!, secret = process.env[cfg.clientSecretEnv]!;
  const body = new URLSearchParams({ grant_type: "authorization_code", code: url.searchParams.get("code")!, redirect_uri: redirectUri(provider) });
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded", accept: "application/json" };
  if (cfg.tokenAuth === "basic") headers.authorization = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
  else { body.set("client_id", id); body.set("client_secret", secret); }
  const res = await fetch(cfg.tokenUrl, { method: "POST", headers, body });
  const tok = await res.json();
  if (!res.ok || !tok.access_token) throw new HttpError(400, `Gagal menyambungkan ${cfg.label}.`);

  await admin().from("connectors").upsert({
    user_id: user.id, provider,
    access_token_enc: encrypt(tok.access_token),
    refresh_token_enc: tok.refresh_token ? encrypt(tok.refresh_token) : null,
    expires_at: tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null,
    scopes: tok.scope ?? cfg.scopes, account_label: tok.team_id ?? tok.user_id ?? null,
  }, { onConflict: "user_id,provider" });
  return NextResponse.redirect(new URL("/connectors?connected=" + provider, process.env.NEXT_PUBLIC_APP_URL));
});
