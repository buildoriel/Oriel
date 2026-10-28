// Abuse report review for the Oriel team.
//   npx tsx --env-file=.env.local scripts/moderation.ts                       open reports, grouped by site
//   npx tsx --env-file=.env.local scripts/moderation.ts suspend <slug> "<reason>"   take the site down, notify the owner
//   npx tsx --env-file=.env.local scripts/moderation.ts restore <slug>        bring it back
//   npx tsx --env-file=.env.local scripts/moderation.ts dismiss <report_id>   close a report without action
// A suspended site returns HTTP 451 on its subdomain and custom domains, cannot be republished,
// and is removed from the showcase.
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function project(slug: string) {
  const { data } = await db.from("projects").select("id, owner_id, name, slug, suspended_at").eq("slug", slug).maybeSingle();
  if (!data) throw new Error(`No project with slug ${slug}`);
  return data;
}

async function main() {
  const [op, arg, reason] = process.argv.slice(2);
  const now = new Date().toISOString();

  if (op === "suspend") {
    if (!reason) throw new Error('Usage: suspend <slug> "<reason>"');
    const p = await project(arg);
    await db.from("projects").update({ suspended_at: now, suspended_reason: reason, featured_at: null }).eq("id", p.id);
    await db.from("abuse_reports").update({ status: "actioned", resolved_at: now }).eq("project_id", p.id).eq("status", "open");
    await db.from("notifications").insert({ user_id: p.owner_id, kind: "project_suspended",
      body: `Your project "${p.name}" (${p.slug}) was taken down after an abuse review: ${reason}. Contact support if you think this is a mistake.` });
    return console.log(`suspended ${p.slug}`);
  }
  if (op === "restore") {
    const p = await project(arg);
    await db.from("projects").update({ suspended_at: null, suspended_reason: null }).eq("id", p.id);
    await db.from("notifications").insert({ user_id: p.owner_id, kind: "project_restored", body: `Your project "${p.name}" (${p.slug}) is back online.` });
    return console.log(`restored ${p.slug}`);
  }
  if (op === "dismiss") {
    const { data, error } = await db.from("abuse_reports").update({ status: "dismissed", resolved_at: now }).eq("id", Number(arg)).eq("status", "open").select("id");
    if (error) throw error;
    return console.log(data?.length ? `dismissed report ${arg}` : `report ${arg} not found or already closed`);
  }

  const { data: reports, error } = await db.from("abuse_reports")
    .select("id, url, category, details, reporter_email, source, created_at, project_id, projects(slug, name, suspended_at)")
    .eq("status", "open").order("created_at", { ascending: true }).limit(500);
  if (error) throw error;
  if (!reports?.length) return console.log("No open reports.");
  const bySite = new Map<string, any[]>();
  for (const r of reports as any[]) {
    const key = r.projects?.slug ?? "(deleted project)";
    bySite.set(key, [...(bySite.get(key) ?? []), r]);
  }
  for (const [slug, rs] of [...bySite].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${slug}  ${rs.length} report(s)${rs[0].projects?.suspended_at ? "  [already suspended]" : ""}`);
    for (const r of rs) console.log(`  #${r.id} ${r.created_at.slice(0, 16)} ${r.source === "auto_scan" ? "[auto-scan] " : ""}${r.category.padEnd(13)} ${r.url}${r.details ? `\n      "${r.details.slice(0, 200)}"` : ""}${r.reporter_email ? `  <${r.reporter_email}>` : ""}`);
  }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
