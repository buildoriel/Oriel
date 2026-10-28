import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { OAUTH, MIN_TIER, redirectUri, type ProviderId } from "@/lib/connectors/providers";
import { requireTier } from "@/lib/tier-guard";
import { handle } from "@/lib/http";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ provider: string }> }) => {
  const user = await requireUser();
  const provider = (await ctx.params).provider as ProviderId;
  if (!(provider in OAUTH)) throw new HttpError(404, "Unknown connector.");
  await requireTier(user.id, MIN_TIER[provider], `The ${provider} connector`);
  const cfg = OAUTH[provider as keyof typeof OAUTH];
  const state = randomBytes(16).toString("hex");
  (await cookies()).set(`oauth_${provider}`, state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  const u = new URL(cfg.authUrl);
  u.searchParams.set("client_id", process.env[cfg.clientIdEnv]!);
  u.searchParams.set("redirect_uri", redirectUri(provider));
  u.searchParams.set("state", state);
  u.searchParams.set("response_type", "code");
  if (cfg.scopes) u.searchParams.set("scope", cfg.scopes);
  for (const [k, v] of Object.entries(cfg.extraAuthParams ?? {})) u.searchParams.set(k, v);
  return NextResponse.redirect(u);
});
