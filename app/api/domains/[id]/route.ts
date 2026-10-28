import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { verifyDomain, detachFromVercel } from "@/lib/domains";
import { cloudflareDeleteCname } from "@/lib/connectors/actions";
import { SITES_CNAME_TARGET } from "@/lib/config";
import { handle } from "@/lib/http";

async function own(userId: string, id: string) {
  const { data } = await admin().from("domains").select("id, hostname").eq("id", id).eq("owner_id", userId).maybeSingle();
  if (!data) throw new HttpError(404, "Domain tidak ditemukan.");
  return data;
}
// POST = cek sekarang
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(); const { id } = await ctx.params;
  await own(user.id, id);
  return NextResponse.json(await verifyDomain(id));
});
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(); const { id } = await ctx.params;
  const d = await own(user.id, id);
  await detachFromVercel(d.hostname);
  // DNS yang dulu diatur otomatis lewat Cloudflare ikut dibersihkan (best effort; konektor bisa sudah diputus)
  await cloudflareDeleteCname(user.id, d.hostname, SITES_CNAME_TARGET).catch(() => {});
  await admin().from("domains").delete().eq("id", id);
  return NextResponse.json({ ok: true });
});
