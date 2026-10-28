import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { ownProject } from "@/lib/projects";
import { requireTier } from "@/lib/tier-guard";
import { cloudflareUpsertCname } from "@/lib/connectors/actions";
import { SITES_CNAME_TARGET, ROOT_DOMAIN } from "@/lib/config";
import { handle } from "@/lib/http";

export const GET = handle(async () => {
  const user = await requireUser();
  const { data } = await admin().from("domains").select("id, hostname, status, last_error, project_id").eq("owner_id", user.id);
  return NextResponse.json({ domains: data ?? [], cname: SITES_CNAME_TARGET });
});

const Body = z.object({ projectId: z.string().uuid(), hostname: z.string().toLowerCase().regex(/^(?!-)[a-z0-9.-]+\.[a-z]{2,}$/) });

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const b = Body.safeParse(await req.json());
  if (!b.success) throw new HttpError(400, "Nama domain tidak valid.");
  const { projectId, hostname } = b.data;
  if (hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`)) throw new HttpError(400, "Domain itu milik Oriel.");
  await ownProject(user.id, projectId);
  const tier = await requireTier(user.id, "pro", "Custom domain");
  const db = admin();
  const { data: cfg } = await db.from("tiers").select("max_custom_domains").eq("id", tier).single();
  const { count } = await db.from("domains").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
  if (cfg.max_custom_domains >= 0 && (count ?? 0) >= cfg.max_custom_domains)
    throw new HttpError(403, `Tier-mu dibatasi ${cfg.max_custom_domains} custom domain.`);
  const { data, error } = await db.from("domains").insert({ project_id: projectId, owner_id: user.id, hostname }).select("id").single();
  if (error?.code === "23505") throw new HttpError(409, "Domain ini sudah tersambung ke proyek lain.");
  if (error) throw error;

  // Studio + Cloudflare tersambung: atur DNS otomatis
  let auto = false;
  if (tier === "studio") { try { await cloudflareUpsertCname(user.id, hostname, SITES_CNAME_TARGET); auto = true; } catch { /* lanjut manual */ } }
  return NextResponse.json({ id: data.id, auto, record: { type: "CNAME", name: hostname, value: SITES_CNAME_TARGET } });
});
