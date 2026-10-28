import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { ABUSE_CATEGORIES, ipHash, projectForHost } from "@/lib/abuse";
import { handle } from "@/lib/http";

const REPORTS_PER_HOUR = 5;

const Body = z.object({
  url: z.string().trim().max(2000),
  category: z.enum(ABUSE_CATEGORIES),
  details: z.string().trim().max(2000).default(""),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
});

/** Public endpoint: anyone (signed in or not) can report a site hosted on Oriel. */
export const POST = handle(async (req: Request) => {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "Add the site address and pick a reason.");
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(b.data.url) ? b.data.url : `https://${b.data.url}`); }
  catch { throw new HttpError(400, "That doesn't look like a valid web address."); }

  const db = admin();
  const hash = ipHash(req);
  const { count } = await db.from("abuse_reports").select("id", { count: "exact", head: true })
    .eq("ip_hash", hash).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= REPORTS_PER_HOUR) throw new HttpError(429, "Too many reports from your network. Try again in an hour.");

  const project = await projectForHost(url.hostname);
  if (!project) throw new HttpError(404, "That site isn't hosted on Oriel, or it no longer exists.");
  const { data: auth } = await (await supabaseServer()).auth.getUser().catch(() => ({ data: { user: null } }));

  const { error } = await db.from("abuse_reports").insert({
    url: url.toString().slice(0, 2000), hostname: url.hostname.toLowerCase(), project_id: project.id,
    category: b.data.category, details: b.data.details, reporter_email: b.data.email || null,
    reporter_user_id: auth.user?.id ?? null, ip_hash: hash,
  });
  if (error) throw error;
  return NextResponse.json({ ok: true });
});
